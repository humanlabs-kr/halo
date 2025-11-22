// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * HumanPassCampaignUpgradeable
 * Campaign management contract for HumanPass
 * - Holds tokens that will be used for campaigns
 * - UUPS Upgradeable
 */
contract HumanPassCampaignUpgradeable is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _serverSigner
    ) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __EIP712_init("HumanPassCampaign", "1");
        __ReentrancyGuard_init();

        require(_serverSigner != address(0), "Invalid server signer");

        serverSigner = _serverSigner;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    // ===== State Variables =====
    address public serverSigner;
    address public linkVault;

    // EIP-712 typehash for campaign claim signatures
    bytes32 private constant CAMPAIGN_CLAIM_TYPEHASH = keccak256(
        "CampaignClaim(address tokenToReceive,address tokenToSendToVault,uint256 amountToReceive,uint256 amountToSendToVault,bytes32 linkId,address recipient,uint256 deadline,bytes32 campaignId)"
    );

    // EIP-712 typehash for ETH campaign claim signatures
    bytes32 private constant CAMPAIGN_CLAIM_ETH_TYPEHASH = keccak256(
        "CampaignClaimEth(uint256 amountToReceive,uint256 amountToSendToVault,bytes32 linkId,address recipient,uint256 deadline,bytes32 campaignId)"
    );

    // Nonce tracking for campaign claim signatures (UUID)
    mapping(bytes32 => bool) public usedCampaignIds;

    // ===== Events =====
    event EmergencyWithdraw(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );
    event ServerSignerUpdated(address indexed prev, address indexed next);
    event LinkVaultUpdated(address indexed prev, address indexed next);
    event CampaignClaim(
        bytes32 indexed campaignId,
        address indexed token,
        address indexed recipient,
        uint256 amountToReceive,
        uint256 amountToSendToVault,
        bytes32 linkId
    );

    // ===== Admin Functions =====
    function setServerSigner(address newServerSigner) external onlyOwner {
        require(newServerSigner != address(0), "Invalid server signer");
        emit ServerSignerUpdated(serverSigner, newServerSigner);
        serverSigner = newServerSigner;
    }

    function setLinkVault(address newLinkVault) external onlyOwner {
        require(newLinkVault != address(0), "Invalid link vault address");
        emit LinkVaultUpdated(linkVault, newLinkVault);
        linkVault = newLinkVault;
    }

    /**
     * @dev Emergency withdraw function for owner
     * @param token The token address (address(0) for ETH)
     * @param amount The amount to withdraw
     * @param recipient The address to receive the tokens/ETH
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external nonReentrant onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        if (token == address(0)) {
            // Withdraw ETH
            require(address(this).balance >= amount, "Insufficient ETH balance");
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Withdraw ERC20
            require(
                IERC20(token).balanceOf(address(this)) >= amount,
                "Insufficient token balance"
            );
            IERC20(token).safeTransfer(recipient, amount);
        }

        emit EmergencyWithdraw(token, recipient, amount);
    }

    // ===== View Functions =====
    /**
     * @dev Check if a campaign ID (UUID) has been used
     * @param campaignId The UUID (bytes32) campaign ID to check
     * @return True if the campaign ID has been used
     */
    function isCampaignIdUsed(bytes32 campaignId) external view returns (bool) {
        return usedCampaignIds[campaignId];
    }

    // ===== Campaign Functions =====
    /**
     * @dev Claim campaign rewards - gives tokens to user and deposits tokens to vault
     * @param tokenToReceive The token address to give to msg.sender
     * @param tokenToSendToVault The token address to send to HumanPassLinkVaultUpgradeable
     * @param amountToReceive The amount of tokens to give to msg.sender
     * @param amountToSendToVault The amount of tokens to send to HumanPassLinkVaultUpgradeable
     * @param linkId The UUID (bytes32) of the link for the vault deposit
     * @param deadline The deadline for the signature
     * @param campaignId The UUID (bytes32) campaign ID for the signature
     * @param serverSignature The server signature proving the claim
     */
    function claimCampaignReward(
        address tokenToReceive,
        address tokenToSendToVault,
        uint256 amountToReceive,
        uint256 amountToSendToVault,
        bytes32 linkId,
        uint256 deadline,
        bytes32 campaignId,
        bytes calldata serverSignature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Signature expired");
        require(!usedCampaignIds[campaignId], "Campaign ID already used");
        require(linkVault != address(0), "Link vault not set");
        require(amountToReceive > 0 || amountToSendToVault > 0, "Amounts must be greater than 0");

        // Verify server signature
        bytes32 structHash = keccak256(
            abi.encode(
                CAMPAIGN_CLAIM_TYPEHASH,
                tokenToReceive,
                tokenToSendToVault,
                amountToReceive,
                amountToSendToVault,
                linkId,
                msg.sender,
                deadline,
                campaignId
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, serverSignature);
        require(signer == serverSigner, "Invalid server signature");

        // Mark campaign ID as used
        usedCampaignIds[campaignId] = true;

        // Transfer tokens to user (msg.sender)
        if (amountToReceive > 0) {
            require(tokenToReceive != address(0), "Invalid tokenToReceive address");
            require(
                IERC20(tokenToReceive).balanceOf(address(this)) >= amountToReceive,
                "Insufficient contract balance for tokenToReceive"
            );
            IERC20(tokenToReceive).safeTransfer(msg.sender, amountToReceive);
        }

        // Transfer tokens to vault and call depositERC20For
        if (amountToSendToVault > 0) {
            require(tokenToSendToVault != address(0), "Invalid tokenToSendToVault address");
            require(
                IERC20(tokenToSendToVault).balanceOf(address(this)) >= amountToSendToVault,
                "Insufficient contract balance for tokenToSendToVault"
            );
            
            // Approve vault to spend tokens (forceApprove handles resetting if needed)
            SafeERC20.forceApprove(IERC20(tokenToSendToVault), linkVault, amountToSendToVault);
            
            // Call depositERC20For in the vault contract
            IHumanPassLinkVault(linkVault).depositERC20For(
                linkId,
                tokenToSendToVault,
                address(this),
                amountToSendToVault
            );
            
            // Reset approval to zero for security
            SafeERC20.forceApprove(IERC20(tokenToSendToVault), linkVault, 0);
        }

        emit CampaignClaim(
            campaignId,
            tokenToReceive,
            msg.sender,
            amountToReceive,
            amountToSendToVault,
            linkId
        );
    }

    /**
     * @dev Claim campaign rewards in ETH - gives ETH to user and deposits ETH to vault
     * @param amountToReceive The amount of ETH to give to msg.sender
     * @param amountToSendToVault The amount of ETH to send to HumanPassLinkVaultUpgradeable
     * @param linkId The UUID (bytes32) of the link for the vault deposit
     * @param deadline The deadline for the signature
     * @param campaignId The UUID (bytes32) campaign ID for the signature
     * @param serverSignature The server signature proving the claim
     */
    function claimCampaignRewardEth(
        uint256 amountToReceive,
        uint256 amountToSendToVault,
        bytes32 linkId,
        uint256 deadline,
        bytes32 campaignId,
        bytes calldata serverSignature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Signature expired");
        require(!usedCampaignIds[campaignId], "Campaign ID already used");
        require(linkVault != address(0), "Link vault not set");
        require(amountToReceive > 0 || amountToSendToVault > 0, "Amounts must be greater than 0");

        // Verify server signature
        bytes32 structHash = keccak256(
            abi.encode(
                CAMPAIGN_CLAIM_ETH_TYPEHASH,
                amountToReceive,
                amountToSendToVault,
                linkId,
                msg.sender,
                deadline,
                campaignId
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, serverSignature);
        require(signer == serverSigner, "Invalid server signature");

        // Mark campaign ID as used
        usedCampaignIds[campaignId] = true;

        // Check contract has sufficient ETH balance
        uint256 totalAmount = amountToReceive + amountToSendToVault;
        require(
            address(this).balance >= totalAmount,
            "Insufficient contract ETH balance"
        );

        // Transfer ETH to user (msg.sender)
        if (amountToReceive > 0) {
            (bool success, ) = msg.sender.call{value: amountToReceive}("");
            require(success, "ETH transfer to user failed");
        }

        // Transfer ETH to vault and call depositETHFor
        if (amountToSendToVault > 0) {
            // Call depositETHFor in the vault contract
            IHumanPassLinkVault(linkVault).depositETHFor{value: amountToSendToVault}(
                linkId,
                address(this)
            );
        }

        emit CampaignClaim(
            campaignId,
            address(0),
            msg.sender,
            amountToReceive,
            amountToSendToVault,
            linkId
        );
    }

    // ===== UUPS Storage Gap =====
    uint256[50] private __gap;
}


interface IHumanPassLinkVault {
    function depositERC20For(
        bytes32 linkId,
        address token,
        address from,
        uint256 amount
    ) external;

    function depositETHFor(
        bytes32 linkId,
        address from
    ) external payable;
}
