// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import {HumanPassLinkVaultUpgradeable} from "../../src/HumanPassLinkVaultUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Deploy
 * @notice Script to deploy HumanPassLinkVaultUpgradeable
 * @dev Run with:
 *      forge script scripts/link-vault/DeployProduction.s.sol:Deploy --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
 * 
 * Required environment variables:
 *      PRIVATE_KEY - Deployer private key
 *      OWNER_ADDRESS - Owner address (for initialize)
 *      SERVER_SIGNER_ADDRESS - Server signer address (for initialize)
 */
contract Deploy is Script {
    // Deployed contract addresses - will be populated during run
    address public vaultImplementation;
    address public vaultProxy;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address serverSigner = vm.envAddress("SERVER_SIGNER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying HumanPassLinkVaultUpgradeable...");
        console.log("Owner:", owner);
        console.log("Server Signer:", serverSigner);

        // 1. Deploy Implementation
        HumanPassLinkVaultUpgradeable implementation = new HumanPassLinkVaultUpgradeable();
        vaultImplementation = address(implementation);
        console.log("Deployed Implementation at:", vaultImplementation);

        // 2. Encode initialize function call
        bytes memory initData = abi.encodeWithSelector(
            HumanPassLinkVaultUpgradeable.initialize.selector,
            owner,
            serverSigner
        );

        // 3. Deploy Proxy with initialization
        ERC1967Proxy proxy = new ERC1967Proxy(vaultImplementation, initData);
        vaultProxy = address(proxy);
        console.log("Deployed Proxy at:", vaultProxy);

        // 4. Verify initialization
        HumanPassLinkVaultUpgradeable vault = HumanPassLinkVaultUpgradeable(payable(vaultProxy));
        require(vault.owner() == owner, "Owner not set correctly");
        require(vault.serverSigner() == serverSigner, "Server signer not set correctly");

        // 5. Output final configuration
        outputDeploymentSummary();

        vm.stopBroadcast();
    }
    
    function outputDeploymentSummary() public view {
        console.log("\n--- Deployment Summary ---");
        console.log("Vault Implementation:", vaultImplementation);
        console.log("Vault Proxy:", vaultProxy);
        console.log("------------------------\n");
    }
}
