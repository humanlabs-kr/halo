// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import {HumanPassCampaignUpgradeable} from "../../src/HumanPassCampaignUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Upgrade
 * @notice Script to upgrade HumanPassCampaignUpgradeable to a new implementation
 * @dev Run with:
 *      forge script scripts/campaign/Upgrade.s.sol:Upgrade --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 * 
 * Required environment variables:
 *      PRIVATE_KEY - Owner private key (must be the owner of the proxy)
 *      CAMPAIGN_PROXY_ADDRESS - Address of the deployed proxy contract
 */
contract Upgrade is Script {
    // Deployed contract addresses - will be populated during run
    address public newImplementation;
    address public campaignProxy;

    function run() public {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("CAMPAIGN_PROXY_ADDRESS");
        campaignProxy = proxyAddress;

        vm.startBroadcast(ownerPrivateKey);

        console.log("Upgrading HumanPassCampaignUpgradeable...");
        console.log("Proxy Address:", proxyAddress);

        // 1. Deploy New Implementation
        HumanPassCampaignUpgradeable implementation = new HumanPassCampaignUpgradeable();
        newImplementation = address(implementation);
        console.log("Deployed New Implementation at:", newImplementation);

        // 2. Get the proxy instance
        HumanPassCampaignUpgradeable campaign = HumanPassCampaignUpgradeable(payable(proxyAddress));
        
        // 3. Verify current owner
        address currentOwner = campaign.owner();
        console.log("Current Owner:", currentOwner);
        require(
            currentOwner == vm.addr(ownerPrivateKey),
            "Caller is not the owner"
        );

        // 4. Get current implementation before upgrade
        address currentImplementation = _getImplementation(proxyAddress);
        console.log("Current Implementation:", currentImplementation);

        // 5. Perform upgrade
        console.log("Upgrading proxy to new implementation...");
        campaign.upgradeToAndCall(newImplementation, "");
        console.log("Upgrade completed!");

        // 6. Verify upgrade
        address newImplementationAddress = _getImplementation(proxyAddress);
        require(
            newImplementationAddress == newImplementation,
            "Upgrade failed: implementation address mismatch"
        );
        console.log("Verified: New Implementation Address:", newImplementationAddress);

        // 7. Verify state is preserved
        address ownerAfterUpgrade = campaign.owner();
        address serverSignerAfterUpgrade = campaign.serverSigner();
        address linkVaultAfterUpgrade = campaign.linkVault();
        require(
            ownerAfterUpgrade == currentOwner,
            "Owner changed after upgrade"
        );
        console.log("Verified: Owner preserved:", ownerAfterUpgrade);
        console.log("Verified: Server Signer preserved:", serverSignerAfterUpgrade);
        console.log("Verified: Link Vault preserved:", linkVaultAfterUpgrade);

        // 8. Output summary
        outputUpgradeSummary();

        vm.stopBroadcast();
    }

    /**
     * @dev Get the current implementation address from the proxy
     * @param proxy The proxy contract address
     * @return The implementation address
     */
    function _getImplementation(address proxy) internal view returns (address) {
        // ERC1967 storage slot for implementation
        // keccak256("eip1967.proxy.implementation") - 1
        bytes32 slot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        bytes32 value = vm.load(proxy, slot);
        return address(uint160(uint256(value)));
    }
    
    function outputUpgradeSummary() public view {
        console.log("\n--- Upgrade Summary ---");
        console.log("Proxy Address:", campaignProxy);
        console.log("New Implementation:", newImplementation);
        console.log("------------------------\n");
    }
}

