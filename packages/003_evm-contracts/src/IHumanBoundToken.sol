// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IHumanBoundToken
 * @dev Interface for Human Bound Token verification
 * @notice This interface allows other contracts to check if an address is verified as human
 */
interface IHumanBoundToken {
    /**
     * @dev Check if an address is verified as human with minimum verification level
     * @param user The address to check
     * @return true if the user is verified with the required level or higher
     */
    function isHuman(address user) external view returns (bool);
    
    /**
     * @dev Get the token ID associated with a user address
     * @param user The address to check
     * @return The token ID if the user has a token, 0 otherwise
     */
    function getUserTokenId(address user) external view returns (uint256);
}
