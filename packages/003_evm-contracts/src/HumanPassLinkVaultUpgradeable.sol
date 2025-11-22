// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * HumanPassLinkVaultUpgradeable
 * Vault contract for storing tokens and ETH per link ID
 * - Can receive ERC20 tokens and ETH
 * - Withdraw function with server signature verification
 * - Emergency withdraw function for designated account
 * - Tracks balances per link ID and token
 * - UUPS Upgradeable
 */
contract HumanPassLinkVaultUpgradeable is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    ISignatureTransfer public constant PERMIT2 =
        ISignatureTransfer(0x000000000022D473030F116dDEE9F6B43aC78BA3);

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
        __EIP712_init("HumanPassLinkVault", "1");
        __ReentrancyGuard_init();

        require(_serverSigner != address(0), "Invalid server signer");

        serverSigner = _serverSigner;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    // ===== State Variables =====
    address public serverSigner;

    // Mapping: linkId => token => balance
    // For ETH, use address(0) as the token address
    mapping(bytes32 => mapping(address => uint256)) public linkBalances;

    // Mapping: linkId => array of token addresses that have balance
    mapping(bytes32 => address[]) private linkTokens;

    // Mapping: linkId => token => index in linkTokens array (for efficient removal)
    mapping(bytes32 => mapping(address => uint256)) private linkTokenIndex;

    // Mapping: linkId => token => whether token exists in linkTokens array
    mapping(bytes32 => mapping(address => bool)) private linkTokenExists;

    // EIP-712 typehash for withdraw signatures
    bytes32 private constant WITHDRAW_TYPEHASH = keccak256(
        "Withdraw(address token,uint256 amount,address recipient,bytes32 linkId,uint256 deadline,bytes32 withdrawId)"
    );

    // EIP-712 typehash for transfer link balances signatures
    bytes32 private constant TRANSFER_LINK_BALANCES_TYPEHASH = keccak256(
        "TransferLinkBalances(bytes32 linkId,address recipient,uint256 deadline,bytes32 transferId)"
    );

    // Nonce tracking for withdraw signatures (UUID)
    mapping(bytes32 => bool) public usedWithdrawIds;

    // Nonce tracking for transfer link balances signatures (UUID)
    mapping(bytes32 => bool) public usedTransferIds;

    // ===== Events =====
    event Deposit(
        bytes32 indexed linkId,
        address indexed token,
        address indexed depositor,
        uint256 amount
    );
    
    event Withdraw(
        bytes32 indexed linkId,
        bytes32 indexed withdrawId,
        address token,
        address recipient,
        uint256 amount
    );
    event TransferLinkBalances(
        bytes32 indexed linkId,
        bytes32 indexed transferId,
        address[] tokens,
        address recipient
    );
    event EmergencyWithdraw(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );
    event ServerSignerUpdated(address indexed prev, address indexed next);

    // ===== Admin Functions =====
    function setServerSigner(address newServerSigner) external onlyOwner {
        require(newServerSigner != address(0), "Invalid server signer");
        emit ServerSignerUpdated(serverSigner, newServerSigner);
        serverSigner = newServerSigner;
    }

    // ===== Internal Helper Functions =====
    /**
     * @dev Add a token to the link's token list if it doesn't exist
     */
    function _addTokenToLink(bytes32 linkId, address token) private {
        if (!linkTokenExists[linkId][token]) {
            linkTokenIndex[linkId][token] = linkTokens[linkId].length;
            linkTokens[linkId].push(token);
            linkTokenExists[linkId][token] = true;
        }
    }

    /**
     * @dev Remove a token from the link's token list if balance is zero
     */
    function _removeTokenFromLink(bytes32 linkId, address token) private {
        if (linkBalances[linkId][token] == 0 && linkTokenExists[linkId][token]) {
            uint256 index = linkTokenIndex[linkId][token];
            uint256 lastIndex = linkTokens[linkId].length - 1;
            
            if (index != lastIndex) {
                address lastToken = linkTokens[linkId][lastIndex];
                linkTokens[linkId][index] = lastToken;
                linkTokenIndex[linkId][lastToken] = index;
            }
            
            linkTokens[linkId].pop();
            linkTokenExists[linkId][token] = false;
            delete linkTokenIndex[linkId][token];
        }
    }

    // ===== Receive Functions =====
    /**
     * @dev Receive ETH and track it for a specific link ID
     * @param linkId The UUID (bytes32) of the link to credit the deposit to
     */
    function depositETH(bytes32 linkId) external payable {
        require(msg.value > 0, "Must send ETH");
        if (linkBalances[linkId][address(0)] == 0) {
            _addTokenToLink(linkId, address(0));
        }
        linkBalances[linkId][address(0)] += msg.value;
        emit Deposit(linkId, address(0), msg.sender, msg.value);
    }

    /**
     * @dev Deposit ETH for a specific link ID on behalf of another address (for contract calls)
     * @param linkId The UUID (bytes32) of the link to credit the deposit to
     * @param from The address to record as the depositor
     */
    function depositETHFor(bytes32 linkId, address from) external payable {
        require(msg.value > 0, "Must send ETH");
        require(from != address(0), "Invalid from address");
        if (linkBalances[linkId][address(0)] == 0) {
            _addTokenToLink(linkId, address(0));
        }
        linkBalances[linkId][address(0)] += msg.value;
        emit Deposit(linkId, address(0), from, msg.value);
    }

    /**
     * @dev Receive ETH without specifying link ID (fallback)
     * Note: This will not track balances. Use depositETH() for proper tracking.
     */
    receive() external payable {
        // Allow contract to receive ETH, but balances won't be tracked
        // Users should use depositETH() for proper tracking
    }

    /**
     * @dev Deposit ERC20 tokens for a specific link ID using Permit2
     * @param linkId The UUID (bytes32) of the link to credit the deposit to
     * @param permit The Permit2 permit data
     * @param transferDetails The Permit2 transfer details
     * @param signature The Permit2 signature
     */
    function depositERC20(
        bytes32 linkId,
        ISignatureTransfer.PermitTransferFrom calldata permit,
        ISignatureTransfer.SignatureTransferDetails calldata transferDetails,
        bytes calldata signature
    ) external {
        require(permit.permitted.token != address(0), "Invalid token address");
        require(transferDetails.requestedAmount > 0, "Amount must be greater than 0");
        require(transferDetails.to == address(this), "Transfer must be to this contract");
        require(block.timestamp <= permit.deadline, "Permit expired");

        // Transfer tokens using Permit2
        PERMIT2.permitTransferFrom(permit, transferDetails, msg.sender, signature);

        // Update link balance
        address token = permit.permitted.token;
        if (linkBalances[linkId][token] == 0) {
            _addTokenToLink(linkId, token);
        }
        linkBalances[linkId][token] += transferDetails.requestedAmount;

        emit Deposit(linkId, token, msg.sender, transferDetails.requestedAmount);
    }

    /**
     * @dev Deposit ERC20 tokens for a specific link ID (for contract calls, without Permit2)
     * @param linkId The UUID (bytes32) of the link to credit the deposit to
     * @param token The ERC20 token address
     * @param from The address to transfer tokens from
     * @param amount The amount of tokens to deposit
     */
    function depositERC20For(
        bytes32 linkId,
        address token,
        address from,
        uint256 amount
    ) external {
        require(token != address(0), "Invalid token address");
        require(from != address(0), "Invalid from address");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer tokens from the specified address to this contract
        IERC20(token).safeTransferFrom(from, address(this), amount);

        // Update link balance
        if (linkBalances[linkId][token] == 0) {
            _addTokenToLink(linkId, token);
        }
        linkBalances[linkId][token] += amount;

        emit Deposit(linkId, token, from, amount);
    }

    // ===== Withdraw Functions =====
    /**
     * @dev Withdraw tokens or ETH with server signature verification
     * @param token The token address (address(0) for ETH)
     * @param amount The amount to withdraw
     * @param recipient The address to receive the tokens/ETH
     * @param linkId The UUID (bytes32) of the link
     * @param deadline The deadline for the signature
     * @param withdrawId The UUID (bytes32) withdraw ID for the signature
     * @param serverSignature The server signature proving the withdrawal
     */
    function withdraw(
        address token,
        uint256 amount,
        address recipient,
        bytes32 linkId,
        uint256 deadline,
        bytes32 withdrawId,
        bytes calldata serverSignature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Signature expired");
        require(!usedWithdrawIds[withdrawId], "Withdraw ID already used");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        // Verify server signature
        bytes32 structHash = keccak256(
            abi.encode(
                WITHDRAW_TYPEHASH,
                token,
                amount,
                recipient,
                linkId,
                deadline,
                withdrawId
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, serverSignature);
        require(signer == serverSigner, "Invalid server signature");

        // Check if link has sufficient balance
        require(
            linkBalances[linkId][token] >= amount,
            "Insufficient link balance"
        );

        // Mark withdraw ID as used
        usedWithdrawIds[withdrawId] = true;

        // Decrease link balance
        linkBalances[linkId][token] -= amount;

        // Remove token from list if balance is zero
        _removeTokenFromLink(linkId, token);

        // Transfer tokens or ETH
        if (token == address(0)) {
            // Withdraw ETH
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Withdraw ERC20
            require(IERC20(token).transfer(recipient, amount), "Token transfer failed");
        }

        emit Withdraw(linkId, withdrawId, token, recipient, amount);
    }

    /**
     * @dev Transfer all balances for a link ID to a recipient with server signature verification
     * Automatically finds all tokens with balance for the given linkId
     * @param linkId The UUID (bytes32) of the link
     * @param recipient The address to receive the tokens/ETH
     * @param deadline The deadline for the signature
     * @param transferId The UUID (bytes32) transfer ID for the signature
     * @param serverSignature The server signature proving the transfer
     */
    function transferLinkBalances(
        bytes32 linkId,
        address recipient,
        uint256 deadline,
        bytes32 transferId,
        bytes calldata serverSignature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Signature expired");
        require(!usedTransferIds[transferId], "Transfer ID already used");
        require(recipient != address(0), "Invalid recipient");

        // Verify server signature
        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_LINK_BALANCES_TYPEHASH,
                linkId,
                recipient,
                deadline,
                transferId
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, serverSignature);
        require(signer == serverSigner, "Invalid server signature");

        // Mark transfer ID as used
        usedTransferIds[transferId] = true;

        // Get all tokens for this linkId
        address[] memory tokens = linkTokens[linkId];
        require(tokens.length > 0, "No tokens to transfer");

        // Transfer each token's balance
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 balance = linkBalances[linkId][token];
            
            if (balance > 0) {
                // Reset link balance to zero
                linkBalances[linkId][token] = 0;

                // Transfer tokens or ETH
                if (token == address(0)) {
                    // Transfer ETH
                    (bool success, ) = recipient.call{value: balance}("");
                    require(success, "ETH transfer failed");
                } else {
                    // Transfer ERC20
                    require(IERC20(token).transfer(recipient, balance), "Token transfer failed");
                }
            }
        }

        // Clear all tokens from the link (since all balances are now zero)
        // Process in reverse to avoid index issues
        for (uint256 i = tokens.length; i > 0; i--) {
            address token = tokens[i - 1];
            if (linkBalances[linkId][token] == 0 && linkTokenExists[linkId][token]) {
                _removeTokenFromLink(linkId, token);
            }
        }

        emit TransferLinkBalances(linkId, transferId, tokens, recipient);
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
            require(IERC20(token).transfer(recipient, amount), "Token transfer failed");
        }

        emit EmergencyWithdraw(token, recipient, amount);
    }

    // ===== View Functions =====
    /**
     * @dev Get the balance of a specific token for a link ID
     * @param linkId The UUID (bytes32) of the link
     * @param token The token address (address(0) for ETH)
     * @return The balance of the token for the link
     */
    function getLinkBalance(bytes32 linkId, address token) external view returns (uint256) {
        return linkBalances[linkId][token];
    }

    /**
     * @dev Check if a withdraw ID (UUID) has been used
     * @param withdrawId The UUID (bytes32) withdraw ID to check
     * @return True if the withdraw ID has been used
     */
    function isWithdrawIdUsed(bytes32 withdrawId) external view returns (bool) {
        return usedWithdrawIds[withdrawId];
    }

    /**
     * @dev Check if a transfer ID (UUID) has been used
     * @param transferId The UUID (bytes32) transfer ID to check
     * @return True if the transfer ID has been used
     */
    function isTransferIdUsed(bytes32 transferId) external view returns (bool) {
        return usedTransferIds[transferId];
    }

    // ===== UUPS Storage Gap =====
    uint256[50] private __gap;
}


interface ISignatureTransfer {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}
