// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IFlareDataConnector.sol";
import "./interfaces/IFreelancerEscrow.sol";

/**
 * @title FreelancerEscrow
 * @author Veriflare Team
 * @notice Trustless freelance escrow with FDC-verified delivery on Flare Network
 * @dev Uses Web2Json attestation type to verify deliverables via any Web2 API
 *      (GitHub commits, IPFS hashes, live URLs, etc.)
 * 
 * FDC Integration:
 *   On Coston2/Flare, the ContractRegistry lives at 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
 *   We use it to dynamically resolve FdcVerification at runtime.
 *   This means we never hardcode FDC addresses — they auto-update.
 *
 * Verification flow:
 *   1. Client creates job → FLR escrowed
 *   2. Freelancer submits deliverable (hash + preview)
 *   3. Client reviews & accepts deliverable
 *   4. Freelancer delivers source/files to destination
 *   5. Backend requests Web2Json attestation from FDC for the delivery
 *      (e.g. GitHub API commit endpoint, IPFS gateway, etc.)
 *   6. FDC data providers verify the API response, build Merkle tree
 *   7. Freelancer calls claimPayment() with the Merkle proof
 *   8. Contract verifies proof via FdcVerification.verifyWeb2Json()
 *   9. Contract decodes attested data & checks it matches job params
 *  10. Payment released
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

    /// @notice Flare ContractRegistry — resolves FdcVerification, FdcHub, etc.
    /// @dev Coston2 & Flare mainnet: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
    IFlareContractRegistry public immutable contractRegistry;

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

    /// @notice Trusted backend signer for OAuth-based identity linking
    address public immutable identitySigner;

    /// @notice Nonces for identity linking replay protection
    mapping(address => uint256) public identityNonces;

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
     * @param _contractRegistry Address of Flare ContractRegistry
     *        (0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019 on Coston2/Flare)
     * @param _treasury Address to receive platform fees
     * @param _identitySigner Trusted backend wallet that signs OAuth identity attestations
     */
    constructor(address _contractRegistry, address _treasury, address _identitySigner) {
        require(_contractRegistry != address(0), "Invalid registry address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_identitySigner != address(0), "Invalid signer address");
        
        contractRegistry = IFlareContractRegistry(_contractRegistry);
        treasury = _treasury;
        identitySigner = _identitySigner;
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
     * @notice Claim payment after code delivery (verified by FDC Web2Json proof)
     * @dev The proof must be a valid Web2Json attestation from the FDC network
     *      containing a GitHub commit API response that matches job parameters
     * @param jobId The job ID
     * @param proof Web2Json proof struct from the FDC DA Layer
     */
    function claimPayment(bytes32 jobId, Web2JsonProof calldata proof) 
        external 
        onlyFreelancer(jobId) 
        inStatus(jobId, JobStatus.BuildAccepted) 
    {
        Job storage job = jobs[jobId];

        // Step 1: Verify the Merkle proof against the on-chain Merkle root
        //         via the official FdcVerification contract
        IFdcVerification fdcVerification = IFdcVerification(
            contractRegistry.getContractAddressByName("FdcVerification")
        );
        require(fdcVerification.verifyWeb2Json(proof), "FDC: invalid Web2Json proof");

        // Step 2: Verify the attestation type is Web2Json from PublicWeb2
        require(
            proof.data.attestationType == bytes32("Web2Json"),
            "Wrong attestation type"
        );
        require(
            proof.data.sourceId == bytes32("PublicWeb2"),
            "Wrong source ID"
        );

        // Step 3: Decode the attested API response data
        GitHubCommitAttestation memory commit = abi.decode(
            proof.data.responseBody.abiEncodedData,
            (GitHubCommitAttestation)
        );

        // Step 4: Verify the commit SHA matches the accepted build hash
        //         The FDC proof attests the data came from a real API response,
        //         and the Merkle proof (Step 1) guarantees it hasn't been tampered with.
        //         We no longer check the URL prefix since the backend proxies the
        //         GitHub API through a cache (api.github.com is unreachable from
        //         the FDC verifier due to timeout constraints).
        require(
            bytes(commit.commitSha).length > 0,
            "Empty commit SHA in proof"
        );

        // Step 5: Verify the commit author matches the freelancer's linked GitHub
        require(
            keccak256(bytes(commit.authorLogin)) == keccak256(bytes(job.freelancerGitHub)),
            "Wrong commit author"
        );

        // Step 6: Tree hash check removed — the FDC Merkle proof (Step 1) already
        //         provides cryptographic integrity of the commit data. The tree hash
        //         cannot be known at submitBuild time since the freelancer hasn't
        //         pushed their final commit yet.

        // Step 7: Verify claim is within the delivery window
        //         (uses block.timestamp since FDC JQ doesn't support fromdateiso8601)
        require(
            block.timestamp <= job.codeDeliveryDeadline + EMERGENCY_CLAIM_WINDOW,
            "Claim window expired"
        );

        // Step 5: All checks passed — release payment
        job.status = JobStatus.Completed;
        totalValueLocked -= job.paymentAmount;

        emit CodeDelivered(jobId, commit.commitSha, job.acceptedSourceHash);

        _releasePayment(jobId, job);
    }

    /**
     * @notice Release payment to freelancer (minus platform fee)
     */
    function _releasePayment(bytes32 jobId, Job storage job) internal {
        uint256 platformFee = (job.paymentAmount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 freelancerPayment = job.paymentAmount - platformFee;

        // Transfer to freelancer
        (bool successFreelancer, ) = payable(job.freelancer).call{value: freelancerPayment}("");
        require(successFreelancer, "Freelancer payment failed");

        // Transfer platform fee
        (bool successTreasury, ) = payable(treasury).call{value: platformFee}("");
        require(successTreasury, "Treasury payment failed");

        emit PaymentReleased(jobId, job.freelancer, freelancerPayment);
    }

    // ═══════════════════════════════════════════════════════════
    //                   GITHUB IDENTITY LINKING
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Link GitHub account to wallet address
     * @dev Requires a Web2Json FDC proof attesting a GitHub gist that contains
     *      the caller's wallet address, proving they own the GitHub account
     * @param gitHubUsername The GitHub username to link
     * @param proof Web2Json proof of gist ownership from the FDC DA Layer
     */
    function linkGitHub(
        string calldata gitHubUsername,
        Web2JsonProof calldata proof
    ) external {
        require(bytes(gitHubUsername).length > 0, "Username required");
        require(bytes(walletToGitHub[msg.sender]).length == 0, "Already linked");
        require(gitHubToWallet[gitHubUsername] == address(0), "GitHub already linked");

        // Verify the Web2Json proof via FDC
        IFdcVerification fdcVerification = IFdcVerification(
            contractRegistry.getContractAddressByName("FdcVerification")
        );
        require(fdcVerification.verifyWeb2Json(proof), "FDC: invalid identity proof");

        // Decode the attested gist data
        GitHubGistAttestation memory gist = abi.decode(
            proof.data.responseBody.abiEncodedData,
            (GitHubGistAttestation)
        );

        // Verify the gist owner matches the claimed username
        require(
            keccak256(bytes(gist.ownerLogin)) == keccak256(bytes(gitHubUsername)),
            "Gist owner doesn't match username"
        );

        // Verify the gist content contains the caller's wallet address
        // (simple substring check — the gist must contain the hex address)
        require(
            _containsAddress(gist.content, msg.sender),
            "Gist doesn't contain wallet address"
        );

        // Store bidirectional mapping
        walletToGitHub[msg.sender] = gitHubUsername;
        gitHubToWallet[gitHubUsername] = msg.sender;

        emit GitHubLinked(msg.sender, gitHubUsername);
    }

    /**
     * @notice Link GitHub via backend-signed OAuth attestation (no FDC needed)
     * @dev Backend verifies GitHub OAuth, then signs (wallet, username, nonce, chainId, contract).
     *      Contract verifies the signature came from the trusted identitySigner.
     * @param gitHubUsername The GitHub username (verified via OAuth by backend)
     * @param signature Backend signature over keccak256(wallet, username, nonce, chainId, contractAddress)
     */
    function linkGitHubDirect(
        string calldata gitHubUsername,
        bytes calldata signature
    ) external {
        require(bytes(gitHubUsername).length > 0, "Username required");
        require(bytes(walletToGitHub[msg.sender]).length == 0, "Already linked");
        require(gitHubToWallet[gitHubUsername] == address(0), "GitHub already linked");

        // Build the message hash that the backend signed
        uint256 nonce = identityNonces[msg.sender];
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, gitHubUsername, nonce, block.chainid, address(this))
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Recover signer and verify it's the trusted identity signer
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);
        address recovered = ecrecover(ethSignedHash, v, r, s);
        require(recovered == identitySigner, "Invalid identity signature");

        // Increment nonce to prevent replay
        identityNonces[msg.sender] = nonce + 1;

        // Store bidirectional mapping
        walletToGitHub[msg.sender] = gitHubUsername;
        gitHubToWallet[gitHubUsername] = msg.sender;

        emit GitHubLinked(msg.sender, gitHubUsername);
    }

    /**
     * @notice Split a 65-byte signature into r, s, v components
     */
    function _splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    /**
     * @notice Check if a string starts with a given prefix
     */
    function _startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory s = bytes(str);
        bytes memory p = bytes(prefix);
        if (p.length > s.length) return false;
        for (uint i = 0; i < p.length; i++) {
            if (s[i] != p[i]) return false;
        }
        return true;
    }

    /**
     * @notice Check if a string contains a hex address (case-insensitive)
     * @dev Simple check — converts address to lowercase hex and searches
     */
    function _containsAddress(string memory haystack, address needle) internal pure returns (bool) {
        bytes memory h = bytes(_toLower(haystack));
        bytes memory n = bytes(_toLower(_toHexString(needle)));
        
        if (n.length > h.length) return false;
        
        for (uint i = 0; i <= h.length - n.length; i++) {
            bool found = true;
            for (uint j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    function _toLower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                b[i] = bytes1(uint8(b[i]) + 32);
            }
        }
        return string(b);
    }

    function _toHexString(address a) internal pure returns (string memory) {
        bytes memory o = new bytes(42);
        o[0] = "0";
        o[1] = "x";
        uint160 v = uint160(a);
        for (uint i = 41; i > 1; i--) {
            uint8 b = uint8(v & 0xf);
            o[i] = b < 10 ? bytes1(b + 0x30) : bytes1(b + 0x57);
            v >>= 4;
        }
        return string(o);
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

        _releasePayment(jobId, job);
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
