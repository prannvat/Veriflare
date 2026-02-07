// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFlareDataConnector
 * @notice Interface for Flare Data Connector verification
 * @dev Used to verify attestations from external data sources (GitHub)
 */
interface IFlareDataConnector {
    /**
     * @notice Verify a proof from the Flare Data Connector
     * @param proof The encoded attestation proof
     * @return valid Whether the proof is valid
     */
    function verifyProof(bytes calldata proof) external view returns (bool valid);

    /**
     * @notice Verify a GitHub commit attestation
     * @param attestationType The type of attestation
     * @param sourceId The source identifier (e.g., "github")
     * @param requestBody The encoded request body
     * @param responseBody The encoded response body
     * @return valid Whether the attestation is valid
     */
    function verifyAttestation(
        bytes32 attestationType,
        bytes32 sourceId,
        bytes calldata requestBody,
        bytes calldata responseBody
    ) external view returns (bool valid);
}

/**
 * @title IGitHubAttestation
 * @notice Decoded GitHub attestation structure
 */
interface IGitHubAttestation {
    struct CommitAttestation {
        string repoFullName;      // "owner/repo"
        string commitHash;        // SHA of the commit
        bytes32 treeHash;         // Hash of all files in commit
        string authorGitHubId;    // GitHub username of author
        uint256 commitTimestamp;  // Unix timestamp of commit
        string branch;            // Branch name
    }

    struct GistAttestation {
        string gistId;            // Gist ID
        string ownerGitHubId;     // GitHub username of gist owner
        string content;           // Gist content (for signature verification)
        uint256 createdAt;        // Unix timestamp
    }
}
