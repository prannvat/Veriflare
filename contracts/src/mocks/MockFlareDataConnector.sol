// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IFlareDataConnector.sol";

/**
 * @title MockContractRegistry
 * @notice Mocks the Flare ContractRegistry for local/test deployments
 * @dev Returns addresses of sibling mock contracts (MockFdcVerification)
 */
contract MockContractRegistry is IFlareContractRegistry {
    mapping(string => address) internal _contracts;

    function setContract(string calldata name, address addr) external {
        _contracts[name] = addr;
    }

    function getContractAddressByName(string calldata name)
        external
        view
        override
        returns (address)
    {
        return _contracts[name];
    }
}

/**
 * @title MockFdcVerification
 * @notice Mocks the FdcVerification contract for testing
 * @dev By default auto-approves all proofs. Toggle with setAutoApprove(false).
 */
contract MockFdcVerification is IFdcVerification {
    bool public autoApprove = true;

    /// @notice Set auto-approve mode
    function setAutoApprove(bool _autoApprove) external {
        autoApprove = _autoApprove;
    }

    /// @notice Always returns autoApprove value
    function verifyWeb2Json(Web2JsonProof calldata)
        external
        view
        override
        returns (bool)
    {
        return autoApprove;
    }
}

/**
 * @title MockFdcHub
 * @notice Mocks the FdcHub for testing attestation request submission
 */
contract MockFdcHub is IFdcHub {
    event AttestationRequested(bytes data, uint256 fee);

    function requestAttestation(bytes calldata _data) external payable override {
        emit AttestationRequested(_data, msg.value);
    }
}

/**
 * @title MockFlareSetup
 * @notice Convenience contract that deploys all mocks and wires them together
 * @dev Use in tests/deploy scripts:
 *        MockFlareSetup setup = new MockFlareSetup();
 *        FreelancerEscrow escrow = new FreelancerEscrow(setup.registry(), treasury);
 */
contract MockFlareSetup {
    MockContractRegistry public registry;
    MockFdcVerification public fdcVerification;
    MockFdcHub public fdcHub;

    constructor() {
        registry = new MockContractRegistry();
        fdcVerification = new MockFdcVerification();
        fdcHub = new MockFdcHub();

        registry.setContract("FdcVerification", address(fdcVerification));
        registry.setContract("FdcHub", address(fdcHub));
    }
}

/**
 * @notice Helper library to build mock Web2Json proofs for testing
 */
library MockProofBuilder {
    function buildCommitProof(
        string memory repoFullName,
        string memory commitSha,
        string memory treeHash,
        string memory authorLogin
    ) internal pure returns (Web2JsonProof memory proof) {
        GitHubCommitAttestation memory commit = GitHubCommitAttestation({
            commitSha: commitSha,
            treeHash: treeHash,
            authorLogin: authorLogin
        });

        proof.merkleProof = new bytes32[](0);
        proof.data.attestationType = bytes32("Web2Json");
        proof.data.sourceId = bytes32("PublicWeb2");
        proof.data.votingRound = 0;
        proof.data.lowestUsedTimestamp = 0;
        proof.data.requestBody.url = string(
            abi.encodePacked("https://api.github.com/repos/", repoFullName, "/commits/", commitSha)
        );
        proof.data.responseBody.abiEncodedData = abi.encode(commit);
    }

    function buildGistProof(
        string memory ownerLogin,
        string memory content
    ) internal pure returns (Web2JsonProof memory proof) {
        GitHubGistAttestation memory gist = GitHubGistAttestation({
            ownerLogin: ownerLogin,
            content: content
        });

        proof.merkleProof = new bytes32[](0);
        proof.data.attestationType = bytes32("Web2Json");
        proof.data.sourceId = bytes32("PublicWeb2");
        proof.data.votingRound = 0;
        proof.data.lowestUsedTimestamp = 0;
        proof.data.responseBody.abiEncodedData = abi.encode(gist);
    }
}
