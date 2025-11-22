// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import {HumanPassCampaignUpgradeable} from "../../src/HumanPassCampaignUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Deploy
 * @notice Script to deploy HumanPassCampaignUpgradeable
 * @dev Run with:
 *      forge script scripts/campaign/Deploy.s.sol:Deploy --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
 * 
 * Required environment variables:
 *      PRIVATE_KEY - Deployer private key
 *      OWNER_ADDRESS - Owner address (for initialize)
 *      SERVER_SIGNER_ADDRESS - Server signer address (for initialize)
 */
contract Deploy is Script {
    // Hardcoded link vault address
    address public constant LINK_VAULT_ADDRESS = 0xD9fD104114549833E954EB3CAF7F94B42Ad913a0; // TODO: Set the deployed link vault proxy address

    // Deployed contract addresses - will be populated during run
    address public campaignImplementation;
    address public campaignProxy;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address serverSigner = vm.envAddress("SERVER_SIGNER_ADDRESS");
        address linkVault = LINK_VAULT_ADDRESS;

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying HumanPassCampaignUpgradeable...");
        console.log("Owner:", owner);
        console.log("Server Signer:", serverSigner);
        console.log("Link Vault:", linkVault);

        // 1. Deploy Implementation
        HumanPassCampaignUpgradeable implementation = new HumanPassCampaignUpgradeable();
        campaignImplementation = address(implementation);
        console.log("Deployed Implementation at:", campaignImplementation);

        // 2. Encode initialize function call
        bytes memory initData = abi.encodeWithSelector(
            HumanPassCampaignUpgradeable.initialize.selector,
            owner,
            serverSigner
        );

        // 3. Deploy Proxy with initialization
        ERC1967Proxy proxy = new ERC1967Proxy(campaignImplementation, initData);
        campaignProxy = address(proxy);
        console.log("Deployed Proxy at:", campaignProxy);

        // 4. Verify initialization
        HumanPassCampaignUpgradeable campaign = HumanPassCampaignUpgradeable(payable(campaignProxy));
        require(campaign.owner() == owner, "Owner not set correctly");
        require(campaign.serverSigner() == serverSigner, "Server signer not set correctly");

        // 5. Set link vault address
        require(linkVault != address(0), "LINK_VAULT_ADDRESS must be set");
        console.log("Setting link vault address...");
        campaign.setLinkVault(linkVault);
        require(campaign.linkVault() == linkVault, "Link vault not set correctly");
        console.log("Link vault set successfully");

        // 6. Output final configuration
        outputDeploymentSummary(linkVault);

        vm.stopBroadcast();
    }
    
    function outputDeploymentSummary(address linkVault) public view {
        console.log("\n--- Deployment Summary ---");
        console.log("Campaign Implementation:", campaignImplementation);
        console.log("Campaign Proxy:", campaignProxy);
        console.log("Link Vault:", linkVault);
        console.log("------------------------\n");
    }
}

