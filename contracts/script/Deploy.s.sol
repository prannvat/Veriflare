// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/FreelancerEscrow.sol";
import "../src/mocks/MockFlareDataConnector.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Veriflare contracts
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasury = vm.envOr("TREASURY_ADDRESS", msg.sender);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock FDC for testnet (use real FDC address on mainnet)
        MockFlareDataConnector mockFdc = new MockFlareDataConnector();
        console.log("MockFlareDataConnector deployed at:", address(mockFdc));

        // Deploy main escrow contract
        FreelancerEscrow escrow = new FreelancerEscrow(
            address(mockFdc),
            treasury
        );
        console.log("FreelancerEscrow deployed at:", address(escrow));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Network:", block.chainid);
        console.log("Treasury:", treasury);
        console.log("\nAdd these to your .env:");
        console.log("FDC_CONTRACT_ADDRESS=", address(mockFdc));
        console.log("ESCROW_CONTRACT_ADDRESS=", address(escrow));
    }
}

/**
 * @title DeployMainnet
 * @notice Mainnet deployment with real FDC address
 */
contract DeployMainnet is Script {
    // Flare mainnet FDC address (update when available)
    address constant FLARE_FDC = address(0); // TODO: Add real FDC address

    function run() external {
        require(FLARE_FDC != address(0), "Set FDC address before mainnet deploy");

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        FreelancerEscrow escrow = new FreelancerEscrow(FLARE_FDC, treasury);
        console.log("FreelancerEscrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}
