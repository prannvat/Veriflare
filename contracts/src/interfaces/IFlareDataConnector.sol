// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// ═══════════════════════════════════════════════════════════════
//   Real Flare protocol interfaces for FDC (Web2Json attestation)
//   Reference: https://dev.flare.network/fdc/overview
// ═══════════════════════════════════════════════════════════════

/**
 * @title IFlareContractRegistry
 * @notice Minimal interface for the Flare ContractRegistry
 * @dev On Coston2/Flare, deployed at 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
 */
interface IFlareContractRegistry {
    function getContractAddressByName(string calldata name) external view returns (address);
}

/**
 * @title IFdcVerification
 * @notice Minimal interface for FDC Merkle proof verification
 * @dev Obtained via ContractRegistry.getContractAddressByName("FdcVerification")
 */
interface IFdcVerification {
    function verifyWeb2Json(Web2JsonProof calldata _proof) external view returns (bool);
}

/**
 * @title IFdcHub
 * @notice Minimal interface for submitting attestation requests
 * @dev Obtained via ContractRegistry.getContractAddressByName("FdcHub")
 */
interface IFdcHub {
    function requestAttestation(bytes calldata _data) external payable;
}

// ═══════════════════════════════════════════════════════════════
//       Web2Json attestation type structs (IWeb2Json.Proof)
//       Matches @flarenetwork/flare-periphery-contracts
// ═══════════════════════════════════════════════════════════════

struct Web2JsonRequestBody {
    string url;
    string httpMethod;
    string headers;
    string queryParams;
    string body;
    string postProcessJq;
    string abiSignature;
}

struct Web2JsonResponseBody {
    bytes abiEncodedData;
}

struct Web2JsonData {
    bytes32 attestationType;      // bytes32("Web2Json")
    bytes32 sourceId;             // bytes32("PublicWeb2")
    uint64 votingRound;
    uint64 lowestUsedTimestamp;
    Web2JsonRequestBody requestBody;
    Web2JsonResponseBody responseBody;
}

struct Web2JsonProof {
    bytes32[] merkleProof;
    Web2JsonData data;
}

// ═══════════════════════════════════════════════════════════════
//   Decoded attestation payload structs
//   (these are what we ABI-decode from Web2Json.responseBody.abiEncodedData)
// ═══════════════════════════════════════════════════════════════

/// @notice GitHub commit data returned by the GitHub API, attested via Web2Json
/// @dev Only includes fields extractable via the FDC verifier's JQ subset.
///      Repo is verified via proof.data.requestBody.url instead.
struct GitHubCommitAttestation {
    string commitSha;         // SHA of the commit
    string treeHash;          // Git tree hash (hex string)
    string authorLogin;       // GitHub username of commit author
}

/// @notice GitHub gist data for identity verification, attested via Web2Json
struct GitHubGistAttestation {
    string ownerLogin;        // GitHub username of gist owner
    string content;           // Full gist content (contains wallet address)
}
