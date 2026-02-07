// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IFlareDataConnector.sol";

/**
 * @title IFreelancerEscrow
 * @notice Interface for the Veriflare Freelancer Escrow contract
 */
interface IFreelancerEscrow {
    // ═══════════════════════════════════════════════════════════
    //                          ENUMS
    // ═══════════════════════════════════════════════════════════

    enum JobStatus {
        Open,           // Waiting for freelancer to accept
        InProgress,     // Freelancer working on the job
        BuildSubmitted, // Build uploaded, awaiting client review
        BuildAccepted,  // Client approved build, awaiting code transfer
        CodeDelivered,  // Code pushed, awaiting FDC verification
        Completed,      // Verified and paid
        Disputed,       // In arbitration
        Cancelled       // Job cancelled
    }

    // ═══════════════════════════════════════════════════════════
    //                         STRUCTS
    // ═══════════════════════════════════════════════════════════

    struct Job {
        // Parties
        address client;
        address freelancer;
        string freelancerGitHub;
        
        // Payment
        uint256 paymentAmount;
        address paymentToken;       // address(0) for native FLR
        
        // Delivery destination
        string clientRepo;          // "owner/repo"
        string targetBranch;        // "main" or "delivery"
        
        // Verification hashes
        bytes32 requirementsHash;   // IPFS hash of detailed spec
        bytes32 acceptedBuildHash;  // Hash of accepted build artifact
        bytes32 acceptedSourceHash; // Hash of source code (git tree hash)
        
        // Timing
        uint256 deadline;
        uint256 reviewPeriod;
        uint256 codeDeliveryDeadline;
        
        // Status
        JobStatus status;
    }

    struct BuildSubmission {
        bytes32 buildHash;
        bytes32 sourceCodeHash;
        string previewUrl;
        string buildManifestIpfs;
        uint256 submittedAt;
    }

    // ═══════════════════════════════════════════════════════════
    //                         EVENTS
    // ═══════════════════════════════════════════════════════════

    event JobCreated(
        bytes32 indexed jobId,
        address indexed client,
        string clientRepo,
        uint256 paymentAmount,
        uint256 deadline
    );

    event JobAccepted(
        bytes32 indexed jobId,
        address indexed freelancer,
        string freelancerGitHub
    );

    event BuildSubmitted(
        bytes32 indexed jobId,
        bytes32 buildHash,
        bytes32 sourceCodeHash,
        string previewUrl
    );

    event BuildAccepted(
        bytes32 indexed jobId,
        bytes32 sourceHash,
        uint256 codeDeliveryDeadline
    );

    event ChangesRequested(
        bytes32 indexed jobId,
        bytes32 newRequirementsHash
    );

    event CodeDelivered(
        bytes32 indexed jobId,
        string commitHash,
        bytes32 treeHash
    );

    event PaymentReleased(
        bytes32 indexed jobId,
        address indexed freelancer,
        uint256 amount
    );

    event JobCancelled(
        bytes32 indexed jobId,
        address indexed cancelledBy,
        string reason
    );

    event DisputeOpened(
        bytes32 indexed jobId,
        address indexed openedBy,
        string reason
    );

    event GitHubLinked(
        address indexed wallet,
        string gitHubUsername
    );

    // ═══════════════════════════════════════════════════════════
    //                       FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    // Job Lifecycle
    function createJob(
        string calldata clientRepo,
        string calldata targetBranch,
        bytes32 requirementsHash,
        uint256 deadline,
        uint256 reviewPeriod
    ) external payable returns (bytes32 jobId);

    function acceptJob(bytes32 jobId) external;

    function submitBuild(
        bytes32 jobId,
        bytes32 buildHash,
        bytes32 sourceCodeHash,
        string calldata previewUrl,
        string calldata buildManifestIpfs
    ) external;

    function acceptBuild(bytes32 jobId) external;

    function requestChanges(bytes32 jobId, bytes32 newRequirementsHash) external;

    function claimPayment(bytes32 jobId, Web2JsonProof calldata proof) external;

    // Safety Mechanisms
    function refundClient(bytes32 jobId) external;

    function freelancerReclaimAfterAcceptance(bytes32 jobId) external;

    function openDispute(bytes32 jobId, string calldata reason) external;

    // Identity
    function linkGitHub(
        string calldata gitHubUsername,
        Web2JsonProof calldata proof
    ) external;

    // View Functions
    function getJob(bytes32 jobId) external view returns (Job memory);

    function getBuildSubmission(bytes32 jobId) external view returns (BuildSubmission memory);

    function getWalletGitHub(address wallet) external view returns (string memory);

    function isGitHubLinked(address wallet) external view returns (bool);
}
