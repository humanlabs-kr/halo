// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IHumanVerifier
 * @dev Interface for Human Verifier contract
 * @notice This interface allows other contracts to check human verification with hierarchical levels
 */
interface IHumanVerifier {
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
    function isHuman(address user, string calldata minVerification) external view returns (bool);
    
    /**
     * @dev Get verification status for both device and orb
     * @param user The address to check
     * @return hasDevice true if user has device verification
     * @return hasOrb true if user has orb verification
     */
    function getVerificationStatus(address user) external view returns (bool hasDevice, bool hasOrb);
    
    /**
     * @dev Get the highest verification level for a user
     * @param user The address to check
     * @return verificationLevel "orb", "device", or "none"
     */
    function getHighestVerificationLevel(address user) external view returns (string memory verificationLevel);
}
