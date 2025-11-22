// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IHumanBoundToken.sol";
import "./IHumanVerifier.sol";

/**
 * HumanVerifierUpgradeable
 * Centralized verification contract that checks both Device and Orb tokens
 * - Queries HumanBoundTokenDeviceUpgradeable and HumanBoundTokenOrbUpgradeable
 * - Provides unified isHuman function with verification level hierarchy
 * - UUPS Upgradeable
 */
contract HumanVerifierUpgradeable is 
    Initializable,
    OwnableUpgradeable, 
    UUPSUpgradeable,
    IHumanVerifier 
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { 
        _disableInitializers(); 
    }

    function initialize(
        address initialOwner,
        address _deviceToken,
        address _orbToken
    ) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        
        require(_deviceToken != address(0), "Invalid device token address");
        require(_orbToken != address(0), "Invalid orb token address");
        
        deviceToken = IHumanBoundToken(_deviceToken);
        orbToken = IHumanBoundToken(_orbToken);
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    // ===== State Variables =====
    IHumanBoundToken public deviceToken;
    IHumanBoundToken public orbToken;

    // ===== Verification Functions =====
    /**
     * @dev Check if an address is verified as human with minimum verification level
     * @param user The address to check
     * @param minVerification The minimum verification level required ('orb' or 'device')
     * @return true if the user is verified with the required level or higher
     * 
     * Verification hierarchy:
     * - 'orb': Requires orb verification (highest level)
     * - 'device': Requires device verification or higher (orb also qualifies)
     */
    function isHuman(address user, string calldata minVerification) external view returns (bool) {
        // Check orb verification first (highest level)
        bool hasOrb = address(orbToken) != address(0) && orbToken.isHuman(user);
        
        // Check device verification
        bool hasDevice = address(deviceToken) != address(0) && deviceToken.isHuman(user);
        
        // Determine verification level based on minVerification parameter
        if (keccak256(bytes(minVerification)) == keccak256(bytes("orb"))) {
            // For orb verification, only orb token qualifies
            return hasOrb;
        } else if (keccak256(bytes(minVerification)) == keccak256(bytes("device"))) {
            // For device verification, either device or orb token qualifies
            return hasDevice || hasOrb;
        }
        
        // Invalid verification level
        return false;
    }

    /**
     * @dev Get verification status for both device and orb
     * @param user The address to check
     * @return hasDevice true if user has device verification
     * @return hasOrb true if user has orb verification
     */
    function getVerificationStatus(address user) external view returns (bool hasDevice, bool hasOrb) {
        hasDevice = address(deviceToken) != address(0) && deviceToken.isHuman(user);
        hasOrb = address(orbToken) != address(0) && orbToken.isHuman(user);
    }

    /**
     * @dev Get the highest verification level for a user
     * @param user The address to check
     * @return verificationLevel "orb", "device", or "none"
     */
    function getHighestVerificationLevel(address user) external view returns (string memory verificationLevel) {
        bool hasOrb = address(orbToken) != address(0) && orbToken.isHuman(user);
        if (hasOrb) {
            return "orb";
        }
        
        bool hasDevice = address(deviceToken) != address(0) && deviceToken.isHuman(user);
        if (hasDevice) {
            return "device";
        }
        
        return "none";
    }

    // ===== UUPS Storage Gap =====
    uint256[50] private __gap;
}
