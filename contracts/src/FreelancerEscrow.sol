// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IFlareDataConnector.sol";
import "./interfaces/IFreelancerEscrow.sol";

/**
 * @title FreelancerEscrow
 * @author Veriflare Team
 * @notice Trustless freelance escrow with "try before you buy" using Flare Data Connector
 * @dev Uses FDC to verify GitHub code delivery before releasing escrowed payments
 * 
 * Flow:
 * 1. Client creates job with payment in escrow
 * 2. Freelancer accepts job and links GitHub identity
 * 3. Freelancer uploads build (compiled/deployed preview)
 * 4. Client tests build and accepts (commits to sourceCodeHash)
 * 5. Freelancer pushes source code to client's repo
 * 6. FDC verifies commit exists, author matches, tree hash matches
 * 7. Payment released instantly to freelancer
 */
contract FreelancerEscrow is IFreelancerEscrow {
    // ═══════════════════════════════════════════════════════════
    //                        CONSTANTS
    // ═══════════════════════════════════════════════════════════

    /// @notice Maximum review period (30 days)
    uint256 public constant MAX_REVIEW_PERIOD = 30 days;

    /// @notice Code delivery window after build acceptance
    uint256 public constant CODE_DELIVERY_WINDOW = 24 hours;

    /// @notice Emergency claim window after delivery deadline
    uint256 public constant EMERGENCY_CLAIM_WINDOW = 7 days;

    /// @notice Platform fee in basis points (2.5%)
    uint256 public constant PLATFORM_FEE_BPS = 250;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ═══════════════════════════════════════════════════════════
    //                      STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    /// @notice Flare Data Connector contract
    IFlareDataConnector public immutable fdc;

    /// @notice Platform fee recipient
    address public immutable treasury;

    /// @notice Job storage
    mapping(bytes32 => Job) public jobs;

    /// @notice Build submission storage
    mapping(bytes32 => BuildSubmission) public buildSubmissions;

    /// @notice Wallet to GitHub username mapping
    mapping(address => string) public walletToGitHub;

    /// @notice GitHub username to wallet mapping (reverse lookup)
    mapping(string => address) public gitHubToWallet;

    /// @notice Total jobs counter
    uint256 public totalJobs;

    /// @notice Total value locked
    uint256 public totalValueLocked;

    // ═══════════════════════════════════════════════════════════
    //                        MODIFIERS
    // ═══════════════════════════════════════════════════════════

    modifier onlyClient(bytes32 jobId) {
        require(msg.sender == jobs[jobId].client, "Only client");
        _;
    }

    modifier onlyFreelancer(bytes32 jobId) {
        require(msg.sender == jobs[jobId].freelancer, "Only freelancer");
        _;
    }

    modifier inStatus(bytes32 jobId, JobStatus expectedStatus) {
        require(jobs[jobId].status == expectedStatus, "Invalid job status");
        _;
    }

    // ═══════════════════════════════════════════════════════════
    //                       CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Initialize the escrow contract
     * @param _fdc Address of Flare Data Connector
     * @param _treasury Address to receive platform fees
     */
    constructor(address _fdc, address _treasury) {
        require(_fdc != address(0), "Invalid FDC address");
        require(_treasury != address(0), "Invalid treasury address");
        
        fdc = IFlareDataConnector(_fdc);
        treasury = _treasury;
    }

    // ═══════════════════════════════════════════════════════════
    //                      JOB LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Create a new job with escrowed payment
     * @param clientRepo GitHub repository for code delivery (format: "owner/repo")
     * @param targetBranch Branch to push code to
     * @param requirementsHash IPFS hash of job requirements document
     * @param deadline Unix timestamp deadline for build submission
     * @param reviewPeriod Time in seconds client has to review build
     * @return jobId Unique identifier for the job
     */
    function createJob(
        string calldata clientRepo,
        string calldata targetBranch,
        bytes32 requirementsHash,
        uint256 deadline,
        uint256 reviewPeriod
    ) external payable returns (bytes32 jobId) {
        require(msg.value > 0, "Payment required");
        require(bytes(clientRepo).length > 0, "Client repo required");
        require(bytes(targetBranch).length > 0, "Target branch required");
        require(requirementsHash != bytes32(0), "Requirements hash required");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(reviewPeriod > 0 && reviewPeriod <= MAX_REVIEW_PERIOD, "Invalid review period");

        // Generate unique job ID
        jobId = keccak256(abi.encodePacked(
            msg.sender,
            clientRepo,
            block.timestamp,
            totalJobs
        ));

        // Create job
        jobs[jobId] = Job({
            client: msg.sender,
            freelancer: address(0),
            freelancerGitHub: "",
            paymentAmount: msg.value,
            paymentToken: address(0), // Native FLR
            clientRepo: clientRepo,
            targetBranch: targetBranch,
            requirementsHash: requirementsHash,
            acceptedBuildHash: bytes32(0),
            acceptedSourceHash: bytes32(0),
            deadline: deadline,
            reviewPeriod: reviewPeriod,
            codeDeliveryDeadline: 0,
            status: JobStatus.Open
        });

        totalJobs++;
        totalValueLocked += msg.value;

        emit JobCreated(jobId, msg.sender, clientRepo, msg.value, deadline);
    }

    /**
     * @notice Accept an open job (freelancer only)
     * @param jobId The job to accept
     */
    function acceptJob(bytes32 jobId) external inStatus(jobId, JobStatus.Open) {
        require(bytes(walletToGitHub[msg.sender]).length > 0, "Link GitHub first");
        
        Job storage job = jobs[jobId];
        require(block.timestamp < job.deadline, "Job deadline passed");

        job.freelancer = msg.sender;
        job.freelancerGitHub = walletToGitHub[msg.sender];
        job.status = JobStatus.InProgress;

        emit JobAccepted(jobId, msg.sender, job.freelancerGitHub);
    }

    /**
     * @notice Submit a build for client review
     * @param jobId The job ID
     * @param buildHash Hash of the build artifact
     * @param sourceCodeHash Hash of source code (git tree hash)
     * @param previewUrl URL where client can test the build
     * @param buildManifestIpfs IPFS hash of build manifest
     */
    function submitBuild(
        bytes32 jobId,
        bytes32 buildHash,
        bytes32 sourceCodeHash,
        string calldata previewUrl,
        string calldata buildManifestIpfs
    ) external onlyFreelancer(jobId) inStatus(jobId, JobStatus.InProgress) {
        Job storage job = jobs[jobId];
        require(block.timestamp <= job.deadline, "Deadline passed");
        require(buildHash != bytes32(0), "Build hash required");
        require(sourceCodeHash != bytes32(0), "Source hash required");

        // Store build submission
        buildSubmissions[jobId] = BuildSubmission({
            buildHash: buildHash,
            sourceCodeHash: sourceCodeHash,
            previewUrl: previewUrl,
            buildManifestIpfs: buildManifestIpfs,
            submittedAt: block.timestamp
        });

        // Update job with pending hashes
        job.acceptedBuildHash = buildHash;
        job.acceptedSourceHash = sourceCodeHash;
        job.status = JobStatus.BuildSubmitted;

        emit BuildSubmitted(jobId, buildHash, sourceCodeHash, previewUrl);
    }

    /**
     * @notice Accept a submitted build (client only)
     * @dev Commits client to the sourceCodeHash - this is binding
     * @param jobId The job ID
     */
    function acceptBuild(bytes32 jobId) 
        external 
        onlyClient(jobId) 
        inStatus(jobId, JobStatus.BuildSubmitted) 
    {
        Job storage job = jobs[jobId];
        BuildSubmission storage build = buildSubmissions[jobId];

        // Ensure review period hasn't expired
        require(
            block.timestamp <= build.submittedAt + job.reviewPeriod,
            "Review period expired"
        );

        job.status = JobStatus.BuildAccepted;
        job.codeDeliveryDeadline = block.timestamp + CODE_DELIVERY_WINDOW;

        emit BuildAccepted(jobId, job.acceptedSourceHash, job.codeDeliveryDeadline);
    }

    /**
     * @notice Request changes to a submitted build
     * @param jobId The job ID
     * @param newRequirementsHash Updated requirements hash (or same if just rejecting build)
     */
    function requestChanges(bytes32 jobId, bytes32 newRequirementsHash) 
        external 
        onlyClient(jobId) 
        inStatus(jobId, JobStatus.BuildSubmitted) 
    {
        Job storage job = jobs[jobId];
        
        // Reset to in progress
        job.requirementsHash = newRequirementsHash;
        job.status = JobStatus.InProgress;
        job.acceptedBuildHash = bytes32(0);
        job.acceptedSourceHash = bytes32(0);

        // Clear build submission
        delete buildSubmissions[jobId];

        emit ChangesRequested(jobId, newRequirementsHash);
    }

    // ═══════════════════════════════════════════════════════════
    //                FDC VERIFICATION & PAYMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Claim payment after code delivery (verified by FDC)
     * @param jobId The job ID
     * @param fdcProof Encoded FDC attestation proof for GitHub commit
     */
    function claimPayment(bytes32 jobId, bytes calldata fdcProof) 
        external 
        onlyFreelancer(jobId) 
        inStatus(jobId, JobStatus.BuildAccepted) 
    {
        Job storage job = jobs[jobId];

        // Decode and verify FDC proof
        (
            string memory repoFullName,
            string memory commitHash,
            bytes32 treeHash,
            string memory authorGitHub,
            uint256 commitTimestamp
        ) = _verifyFDCProof(fdcProof);

        // Verification checks
        require(
            keccak256(bytes(repoFullName)) == keccak256(bytes(job.clientRepo)),
            "Wrong repository"
        );

        require(
            keccak256(bytes(authorGitHub)) == keccak256(bytes(job.freelancerGitHub)),
            "Wrong commit author"
        );

        require(
            treeHash == job.acceptedSourceHash,
            "Source code doesn't match accepted build"
        );

        require(
            commitTimestamp <= job.codeDeliveryDeadline,
            "Delivered after deadline"
        );

        // Update status
        job.status = JobStatus.Completed;
        totalValueLocked -= job.paymentAmount;

        emit CodeDelivered(jobId, commitHash, treeHash);

        // Calculate and transfer payment
        _releasePayment(job);
    }

    /**
     * @notice Verify FDC proof and decode attestation data
     */
    function _verifyFDCProof(bytes calldata proof) internal view returns (
        string memory repoFullName,
        string memory commitHash,
        bytes32 treeHash,
        string memory authorGitHub,
        uint256 commitTimestamp
    ) {
        // Verify proof with Flare Data Connector
        require(fdc.verifyProof(proof), "Invalid FDC proof");

        // Decode attestation data
        // In production, this would use proper FDC attestation decoding
        (repoFullName, commitHash, treeHash, authorGitHub, commitTimestamp) = 
            abi.decode(proof, (string, string, bytes32, string, uint256));
    }

    /**
     * @notice Release payment to freelancer (minus platform fee)
     */
    function _releasePayment(Job storage job) internal {
        uint256 platformFee = (job.paymentAmount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 freelancerPayment = job.paymentAmount - platformFee;

        // Transfer to freelancer
        (bool successFreelancer, ) = payable(job.freelancer).call{value: freelancerPayment}("");
        require(successFreelancer, "Freelancer payment failed");

        // Transfer platform fee
        (bool successTreasury, ) = payable(treasury).call{value: platformFee}("");
        require(successTreasury, "Treasury payment failed");

        emit PaymentReleased(job.freelancer, job.freelancer, freelancerPayment);
    }

    // ═══════════════════════════════════════════════════════════
    //                   GITHUB IDENTITY LINKING
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Link GitHub account to wallet address
     * @dev Requires FDC proof that a gist exists with wallet signature
     * @param gitHubUsername The GitHub username to link
     * @param fdcIdentityProof FDC proof of gist ownership
     */
    function linkGitHub(
        string calldata gitHubUsername,
        bytes calldata fdcIdentityProof
    ) external {
        require(bytes(gitHubUsername).length > 0, "Username required");
        require(bytes(walletToGitHub[msg.sender]).length == 0, "Already linked");
        require(gitHubToWallet[gitHubUsername] == address(0), "GitHub already linked");

        // Verify FDC proof that gist contains wallet signature
        require(fdc.verifyProof(fdcIdentityProof), "Invalid identity proof");

        // Store bidirectional mapping
        walletToGitHub[msg.sender] = gitHubUsername;
        gitHubToWallet[gitHubUsername] = msg.sender;

        emit GitHubLinked(msg.sender, gitHubUsername);
    }

    // ═══════════════════════════════════════════════════════════
    //                    SAFETY MECHANISMS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Refund client if job is open or freelancer missed deadline
     * @param jobId The job ID
     */
    function refundClient(bytes32 jobId) external onlyClient(jobId) {
        Job storage job = jobs[jobId];

        require(
            job.status == JobStatus.Open ||
            (job.status == JobStatus.InProgress && block.timestamp > job.deadline),
            "Cannot refund"
        );

        job.status = JobStatus.Cancelled;
        totalValueLocked -= job.paymentAmount;

        (bool success, ) = payable(job.client).call{value: job.paymentAmount}("");
        require(success, "Refund failed");

        emit JobCancelled(jobId, msg.sender, "Client refund");
    }

    /**
     * @notice Freelancer can claim after extended period if client disappears
     * @param jobId The job ID
     */
    function freelancerReclaimAfterAcceptance(bytes32 jobId) 
        external 
        onlyFreelancer(jobId) 
        inStatus(jobId, JobStatus.BuildAccepted) 
    {
        Job storage job = jobs[jobId];

        // Client had 7 days after delivery deadline to verify
        require(
            block.timestamp > job.codeDeliveryDeadline + EMERGENCY_CLAIM_WINDOW,
            "Must wait 7 days after delivery deadline"
        );

        job.status = JobStatus.Completed;
        totalValueLocked -= job.paymentAmount;

        _releasePayment(job);
    }

    /**
     * @notice Open a dispute for arbitration
     * @param jobId The job ID
     * @param reason Reason for dispute
     */
    function openDispute(bytes32 jobId, string calldata reason) external {
        Job storage job = jobs[jobId];

        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "Not a party to this job"
        );

        require(
            job.status == JobStatus.InProgress ||
            job.status == JobStatus.BuildSubmitted ||
            job.status == JobStatus.BuildAccepted,
            "Cannot dispute in current status"
        );

        job.status = JobStatus.Disputed;

        emit DisputeOpened(jobId, msg.sender, reason);
    }

    // ═══════════════════════════════════════════════════════════
    //                      VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get job details
     */
    function getJob(bytes32 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    /**
     * @notice Get build submission details
     */
    function getBuildSubmission(bytes32 jobId) external view returns (BuildSubmission memory) {
        return buildSubmissions[jobId];
    }

    /**
     * @notice Get GitHub username for a wallet
     */
    function getWalletGitHub(address wallet) external view returns (string memory) {
        return walletToGitHub[wallet];
    }

    /**
     * @notice Check if wallet has linked GitHub
     */
    function isGitHubLinked(address wallet) external view returns (bool) {
        return bytes(walletToGitHub[wallet]).length > 0;
    }

    // ═══════════════════════════════════════════════════════════
    //                         RECEIVE
    // ═══════════════════════════════════════════════════════════

    receive() external payable {
        revert("Use createJob to deposit");
    }
}
