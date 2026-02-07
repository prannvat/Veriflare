// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/FreelancerEscrow.sol";
import "../src/mocks/MockFlareDataConnector.sol";

/**
 * @title FreelancerEscrowTest
 * @notice Comprehensive tests for the FreelancerEscrow contract
 */
contract FreelancerEscrowTest is Test {
    FreelancerEscrow public escrow;
    MockFlareDataConnector public mockFdc;

    address public client = address(0x1);
    address public freelancer = address(0x2);
    address public treasury = address(0x3);
    address public randomUser = address(0x4);

    string constant CLIENT_REPO = "client-org/project";
    string constant TARGET_BRANCH = "main";
    string constant FREELANCER_GITHUB = "alice-dev";
    bytes32 constant REQUIREMENTS_HASH = keccak256("requirements");
    bytes32 constant BUILD_HASH = keccak256("build-artifact");
    bytes32 constant SOURCE_HASH = keccak256("source-code");
    string constant PREVIEW_URL = "https://preview.veriflare.io/job-123";
    string constant MANIFEST_IPFS = "QmXxx...";

    uint256 constant PAYMENT_AMOUNT = 1 ether;
    uint256 constant DEADLINE = 7 days;
    uint256 constant REVIEW_PERIOD = 3 days;

    function setUp() public {
        // Deploy contracts
        mockFdc = new MockFlareDataConnector();
        escrow = new FreelancerEscrow(address(mockFdc), treasury);

        // Fund accounts
        vm.deal(client, 10 ether);
        vm.deal(freelancer, 10 ether);

        // Link freelancer's GitHub
        vm.prank(freelancer);
        escrow.linkGitHub(FREELANCER_GITHUB, "");
    }

    // ═══════════════════════════════════════════════════════════
    //                      JOB CREATION
    // ═══════════════════════════════════════════════════════════

    function test_CreateJob() public {
        vm.prank(client);
        bytes32 jobId = escrow.createJob{value: PAYMENT_AMOUNT}(
            CLIENT_REPO,
            TARGET_BRANCH,
            REQUIREMENTS_HASH,
            block.timestamp + DEADLINE,
            REVIEW_PERIOD
        );

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        
        assertEq(job.client, client);
        assertEq(job.paymentAmount, PAYMENT_AMOUNT);
        assertEq(job.clientRepo, CLIENT_REPO);
        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.Open));
        assertEq(escrow.totalJobs(), 1);
        assertEq(escrow.totalValueLocked(), PAYMENT_AMOUNT);
    }

    function test_CreateJob_RevertNoPayment() public {
        vm.prank(client);
        vm.expectRevert("Payment required");
        escrow.createJob(
            CLIENT_REPO,
            TARGET_BRANCH,
            REQUIREMENTS_HASH,
            block.timestamp + DEADLINE,
            REVIEW_PERIOD
        );
    }

    function test_CreateJob_RevertPastDeadline() public {
        vm.prank(client);
        vm.expectRevert("Deadline must be in future");
        escrow.createJob{value: PAYMENT_AMOUNT}(
            CLIENT_REPO,
            TARGET_BRANCH,
            REQUIREMENTS_HASH,
            block.timestamp - 1,
            REVIEW_PERIOD
        );
    }

    // ═══════════════════════════════════════════════════════════
    //                      JOB ACCEPTANCE
    // ═══════════════════════════════════════════════════════════

    function test_AcceptJob() public {
        bytes32 jobId = _createJob();

        vm.prank(freelancer);
        escrow.acceptJob(jobId);

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        
        assertEq(job.freelancer, freelancer);
        assertEq(job.freelancerGitHub, FREELANCER_GITHUB);
        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.InProgress));
    }

    function test_AcceptJob_RevertNoGitHub() public {
        bytes32 jobId = _createJob();

        vm.prank(randomUser);
        vm.expectRevert("Link GitHub first");
        escrow.acceptJob(jobId);
    }

    function test_AcceptJob_RevertAfterDeadline() public {
        bytes32 jobId = _createJob();

        // Fast forward past deadline
        vm.warp(block.timestamp + DEADLINE + 1);

        vm.prank(freelancer);
        vm.expectRevert("Job deadline passed");
        escrow.acceptJob(jobId);
    }

    // ═══════════════════════════════════════════════════════════
    //                     BUILD SUBMISSION
    // ═══════════════════════════════════════════════════════════

    function test_SubmitBuild() public {
        bytes32 jobId = _createAndAcceptJob();

        vm.prank(freelancer);
        escrow.submitBuild(jobId, BUILD_HASH, SOURCE_HASH, PREVIEW_URL, MANIFEST_IPFS);

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        IFreelancerEscrow.BuildSubmission memory build = escrow.getBuildSubmission(jobId);

        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.BuildSubmitted));
        assertEq(job.acceptedBuildHash, BUILD_HASH);
        assertEq(job.acceptedSourceHash, SOURCE_HASH);
        assertEq(build.previewUrl, PREVIEW_URL);
    }

    function test_SubmitBuild_RevertNotFreelancer() public {
        bytes32 jobId = _createAndAcceptJob();

        vm.prank(client);
        vm.expectRevert("Only freelancer");
        escrow.submitBuild(jobId, BUILD_HASH, SOURCE_HASH, PREVIEW_URL, MANIFEST_IPFS);
    }

    // ═══════════════════════════════════════════════════════════
    //                     BUILD ACCEPTANCE
    // ═══════════════════════════════════════════════════════════

    function test_AcceptBuild() public {
        bytes32 jobId = _submitBuild();

        vm.prank(client);
        escrow.acceptBuild(jobId);

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        
        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.BuildAccepted));
        assertGt(job.codeDeliveryDeadline, block.timestamp);
    }

    function test_RequestChanges() public {
        bytes32 jobId = _submitBuild();
        bytes32 newRequirements = keccak256("updated-requirements");

        vm.prank(client);
        escrow.requestChanges(jobId, newRequirements);

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);

        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.InProgress));
        assertEq(job.requirementsHash, newRequirements);
        assertEq(job.acceptedBuildHash, bytes32(0));
    }

    // ═══════════════════════════════════════════════════════════
    //                    PAYMENT & VERIFICATION
    // ═══════════════════════════════════════════════════════════

    function test_ClaimPayment() public {
        bytes32 jobId = _acceptBuild();

        // Create valid FDC proof
        bytes memory fdcProof = abi.encode(
            CLIENT_REPO,
            "abc123", // commit hash
            SOURCE_HASH,
            FREELANCER_GITHUB,
            block.timestamp
        );

        uint256 freelancerBalanceBefore = freelancer.balance;
        uint256 treasuryBalanceBefore = treasury.balance;

        vm.prank(freelancer);
        escrow.claimPayment(jobId, fdcProof);

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        
        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.Completed));

        // Check payments
        uint256 platformFee = (PAYMENT_AMOUNT * 250) / 10000; // 2.5%
        uint256 freelancerPayment = PAYMENT_AMOUNT - platformFee;

        assertEq(freelancer.balance - freelancerBalanceBefore, freelancerPayment);
        assertEq(treasury.balance - treasuryBalanceBefore, platformFee);
        assertEq(escrow.totalValueLocked(), 0);
    }

    function test_ClaimPayment_RevertWrongRepo() public {
        bytes32 jobId = _acceptBuild();

        bytes memory fdcProof = abi.encode(
            "wrong-org/wrong-repo", // Wrong repo
            "abc123",
            SOURCE_HASH,
            FREELANCER_GITHUB,
            block.timestamp
        );

        vm.prank(freelancer);
        vm.expectRevert("Wrong repository");
        escrow.claimPayment(jobId, fdcProof);
    }

    function test_ClaimPayment_RevertWrongAuthor() public {
        bytes32 jobId = _acceptBuild();

        bytes memory fdcProof = abi.encode(
            CLIENT_REPO,
            "abc123",
            SOURCE_HASH,
            "wrong-github-user", // Wrong author
            block.timestamp
        );

        vm.prank(freelancer);
        vm.expectRevert("Wrong commit author");
        escrow.claimPayment(jobId, fdcProof);
    }

    function test_ClaimPayment_RevertWrongSourceHash() public {
        bytes32 jobId = _acceptBuild();

        bytes memory fdcProof = abi.encode(
            CLIENT_REPO,
            "abc123",
            keccak256("different-source"), // Wrong source hash
            FREELANCER_GITHUB,
            block.timestamp
        );

        vm.prank(freelancer);
        vm.expectRevert("Source code doesn't match accepted build");
        escrow.claimPayment(jobId, fdcProof);
    }

    // ═══════════════════════════════════════════════════════════
    //                    SAFETY MECHANISMS
    // ═══════════════════════════════════════════════════════════

    function test_RefundClient_OpenJob() public {
        bytes32 jobId = _createJob();

        uint256 clientBalanceBefore = client.balance;

        vm.prank(client);
        escrow.refundClient(jobId);

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);

        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.Cancelled));
        assertEq(client.balance - clientBalanceBefore, PAYMENT_AMOUNT);
    }

    function test_RefundClient_MissedDeadline() public {
        bytes32 jobId = _createAndAcceptJob();

        // Fast forward past deadline
        vm.warp(block.timestamp + DEADLINE + 1);

        vm.prank(client);
        escrow.refundClient(jobId);

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.Cancelled));
    }

    function test_FreelancerEmergencyClaim() public {
        bytes32 jobId = _acceptBuild();

        // Fast forward past emergency window
        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        vm.warp(job.codeDeliveryDeadline + 7 days + 1);

        uint256 freelancerBalanceBefore = freelancer.balance;

        vm.prank(freelancer);
        escrow.freelancerReclaimAfterAcceptance(jobId);

        job = escrow.getJob(jobId);
        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.Completed));
        assertGt(freelancer.balance, freelancerBalanceBefore);
    }

    function test_OpenDispute() public {
        bytes32 jobId = _createAndAcceptJob();

        vm.prank(client);
        escrow.openDispute(jobId, "Freelancer not responsive");

        IFreelancerEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint256(job.status), uint256(IFreelancerEscrow.JobStatus.Disputed));
    }

    // ═══════════════════════════════════════════════════════════
    //                      HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function _createJob() internal returns (bytes32) {
        vm.prank(client);
        return escrow.createJob{value: PAYMENT_AMOUNT}(
            CLIENT_REPO,
            TARGET_BRANCH,
            REQUIREMENTS_HASH,
            block.timestamp + DEADLINE,
            REVIEW_PERIOD
        );
    }

    function _createAndAcceptJob() internal returns (bytes32) {
        bytes32 jobId = _createJob();
        vm.prank(freelancer);
        escrow.acceptJob(jobId);
        return jobId;
    }

    function _submitBuild() internal returns (bytes32) {
        bytes32 jobId = _createAndAcceptJob();
        vm.prank(freelancer);
        escrow.submitBuild(jobId, BUILD_HASH, SOURCE_HASH, PREVIEW_URL, MANIFEST_IPFS);
        return jobId;
    }

    function _acceptBuild() internal returns (bytes32) {
        bytes32 jobId = _submitBuild();
        vm.prank(client);
        escrow.acceptBuild(jobId);
        return jobId;
    }
}
