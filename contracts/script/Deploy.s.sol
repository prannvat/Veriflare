// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/FreelancerEscrow.sol";
import "../src/mocks/MockFlareDataConnector.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Veriflare contracts (testnet / local)
 * @dev Uses MockFlareSetup for local/test; real ContractRegistry for Coston2
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasury = vm.envOr("TREASURY_ADDRESS", msg.sender);
        address identitySigner = vm.envAddress("IDENTITY_SIGNER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);

        address registryAddr;

        if (block.chainid == 114 || block.chainid == 14) {
            // Coston2 testnet (114) or Flare mainnet (14)
            // Use the real Flare ContractRegistry
            registryAddr = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;
            console.log("Using real Flare ContractRegistry:", registryAddr);
        } else {
            // Local / Anvil / other chains — deploy mock setup
            MockFlareSetup mockSetup = new MockFlareSetup();
            registryAddr = address(mockSetup.registry());
            console.log("MockFlareSetup deployed");
            console.log("  MockContractRegistry:", registryAddr);
            console.log("  MockFdcVerification:", address(mockSetup.fdcVerification()));
            console.log("  MockFdcHub:", address(mockSetup.fdcHub()));
        }

        // Deploy main escrow contract
        FreelancerEscrow escrow = new FreelancerEscrow(
            registryAddr,
            treasury,
            identitySigner
        );
        console.log("FreelancerEscrow deployed at:", address(escrow));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Network:", block.chainid);
        console.log("Treasury:", treasury);
        console.log("\nAdd these to your .env:");
        console.log("CONTRACT_REGISTRY_ADDRESS=", registryAddr);
        console.log("ESCROW_CONTRACT_ADDRESS=", address(escrow));
    }
}

/**
 * @title DeployMainnet
 * @notice Mainnet deployment using real Flare ContractRegistry
 */
contract DeployMainnet is Script {
    /// @notice Flare ContractRegistry — same address on Coston2 and Flare mainnet
    address constant FLARE_CONTRACT_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address identitySigner = vm.envAddress("IDENTITY_SIGNER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        FreelancerEscrow escrow = new FreelancerEscrow(
            FLARE_CONTRACT_REGISTRY,
            treasury,
            identitySigner
        );
        console.log("FreelancerEscrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}
