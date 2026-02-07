// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IFlareDataConnector.sol";

/**
 * @title MockFlareDataConnector
 * @notice Mock FDC for testing and development
 * @dev Always returns true for proofs - DO NOT USE IN PRODUCTION
 */
contract MockFlareDataConnector is IFlareDataConnector {
    
    /// @notice Whether to auto-approve all proofs
    bool public autoApprove = true;

    /// @notice Mapping of proof hashes to validity
    mapping(bytes32 => bool) public validProofs;

    /// @notice Events for testing
    event ProofSubmitted(bytes proof);
    event ProofValidated(bytes32 proofHash, bool valid);

    /**
     * @notice Set auto-approve mode
     */
    function setAutoApprove(bool _autoApprove) external {
        autoApprove = _autoApprove;
    }

    /**
     * @notice Pre-register a valid proof (for testing specific scenarios)
     */
    function registerValidProof(bytes calldata proof) external {
        validProofs[keccak256(proof)] = true;
    }

    /**
     * @notice Invalidate a proof
     */
    function invalidateProof(bytes calldata proof) external {
        validProofs[keccak256(proof)] = false;
    }

    /**
     * @notice Verify a proof - mock implementation
     */
    function verifyProof(bytes calldata proof) external view override returns (bool valid) {
        emit ProofSubmitted(proof);
        
        if (autoApprove) {
            return true;
        }
        
        return validProofs[keccak256(proof)];
    }

    /**
     * @notice Verify attestation - mock implementation
     */
    function verifyAttestation(
        bytes32 attestationType,
        bytes32 sourceId,
        bytes calldata requestBody,
        bytes calldata responseBody
    ) external view override returns (bool valid) {
        // Mock: combine all params into a proof hash
        bytes32 proofHash = keccak256(abi.encodePacked(
            attestationType,
            sourceId,
            requestBody,
            responseBody
        ));

        if (autoApprove) {
            return true;
        }

        return validProofs[proofHash];
    }

    /**
     * @notice Helper to encode a commit attestation for testing
     */
    function encodeCommitAttestation(
        string calldata repoFullName,
        string calldata commitHash,
        bytes32 treeHash,
        string calldata authorGitHub,
        uint256 commitTimestamp
    ) external pure returns (bytes memory) {
        return abi.encode(
            repoFullName,
            commitHash,
            treeHash,
            authorGitHub,
            commitTimestamp
        );
    }

    /**
     * @notice Helper to encode a gist attestation for testing
     */
    function encodeGistAttestation(
        string calldata gistId,
        string calldata ownerGitHub,
        string calldata content,
        uint256 createdAt
    ) external pure returns (bytes memory) {
        return abi.encode(gistId, ownerGitHub, content, createdAt);
    }
}
