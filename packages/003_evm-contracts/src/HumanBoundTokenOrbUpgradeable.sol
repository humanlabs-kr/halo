// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IHumanBoundToken.sol";

/**
 * HumanBoundTokenOrb
 * Soul Bound Token for Orb verification
 * - Non-transferable (Soul Bound)
 * - Only server can mint/burn
 * - UUPS Upgradeable
 */
contract HumanBoundTokenOrbUpgradeable is
    Initializable,
    ERC721Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable,
    PausableUpgradeable,
    IHumanBoundToken 
{
    using ECDSA for bytes32;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { 
        _disableInitializers(); 
    }

    function initialize(
        address initialOwner,
        address _serverSigner,
        string memory name,
        string memory symbol
    ) public initializer {
        __ERC721_init(name, symbol);
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __EIP712_init("HumanBoundTokenOrb", "1");
        __Pausable_init();

        require(_serverSigner != address(0), "Invalid server signer");
        serverSigner = _serverSigner;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    // ===== State Variables =====
    address public serverSigner;
    uint256 private _totalSupply;

    // Token metadata
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address) private _tokenOwners; // Track original owners

    // Human verification mapping
    mapping(address => uint256) private _userTokenIds; // Track user's token ID
    
    // EIP-712 typehash for server signatures
    bytes32 private constant MINT_TYPEHASH = keccak256(
        "MintToken(address to,uint256 tokenId,string tokenURI,uint256 deadline,uint256 nonce)"
    );
    
    bytes32 private constant BURN_TYPEHASH = keccak256(
        "BurnToken(uint256 tokenId,uint256 deadline,uint256 nonce)"
    );

    // Server nonce tracking
    mapping(uint256 => bool) public usedServerNonces;

    // ===== Events =====
    event TokenMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event TokenBurned(uint256 indexed tokenId);
    event TokenMintedWithDetails(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI,
        uint256 timestamp,
        uint256 totalSupply
    );
    event TokenBurnedWithDetails(
        uint256 indexed tokenId,
        address indexed previousOwner,
        uint256 timestamp,
        uint256 totalSupply
    );
    event ServerSignerUpdated(address indexed prev, address indexed next);

    // ===== Admin Functions =====
    function setServerSigner(address newServerSigner) external onlyOwner {
        require(newServerSigner != address(0), "Invalid server signer");
        emit ServerSignerUpdated(serverSigner, newServerSigner);
        serverSigner = newServerSigner;
    }

    function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _tokenURIs[tokenId] = uri;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ===== Server-only Mint Function =====
    struct MintData {
        address to;
        uint256 tokenId;
        string tokenURI;
        uint256 deadline;
        uint256 nonce;
        bytes serverSignature;
    }

    function mint(MintData calldata data) external whenNotPaused {
        require(block.timestamp <= data.deadline, "Signature expired");
        require(!usedServerNonces[data.nonce], "Nonce already used");
        require(data.to != address(0), "Invalid recipient");
        require(data.tokenId > 0, "Invalid token ID");
        require(_userTokenIds[data.to] == 0, "User already has a token");

        // Verify server signature
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                data.to,
                data.tokenId,
                keccak256(bytes(data.tokenURI)),
                data.deadline,
                data.nonce
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, data.serverSignature);
        require(signer == serverSigner, "Invalid server signature");

        // Mark nonce as used
        usedServerNonces[data.nonce] = true;

        // Mint token
        _safeMint(data.to, data.tokenId);
        _tokenURIs[data.tokenId] = data.tokenURI;
        _tokenOwners[data.tokenId] = data.to;
        _userTokenIds[data.to] = data.tokenId; // Track user's token ID
        _totalSupply++;

        emit TokenMinted(data.to, data.tokenId, data.tokenURI);
        emit TokenMintedWithDetails(
            data.to,
            data.tokenId,
            data.tokenURI,
            block.timestamp,
            _totalSupply
        );
    }

    // ===== Server-only Burn Function =====
    struct BurnData {
        uint256 tokenId;
        uint256 deadline;
        uint256 nonce;
        bytes serverSignature;
    }

    function burn(BurnData calldata data) external whenNotPaused {
        require(block.timestamp <= data.deadline, "Signature expired");
        require(!usedServerNonces[data.nonce], "Nonce already used");
        require(_ownerOf(data.tokenId) != address(0), "Token does not exist");

        // Verify server signature
        bytes32 structHash = keccak256(
            abi.encode(
                BURN_TYPEHASH,
                data.tokenId,
                data.deadline,
                data.nonce
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, data.serverSignature);
        require(signer == serverSigner, "Invalid server signature");

        // Mark nonce as used
        usedServerNonces[data.nonce] = true;

        // Burn token
        address owner = ownerOf(data.tokenId);
        _burn(data.tokenId);
        delete _tokenURIs[data.tokenId];
        delete _tokenOwners[data.tokenId];
        delete _userTokenIds[owner]; // Remove user's token ID mapping
        _totalSupply--;

        emit TokenBurned(data.tokenId);
        emit TokenBurnedWithDetails(
            data.tokenId,
            owner,
            block.timestamp,
            _totalSupply
        );
    }

    // ===== View Functions =====
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function getTokenOwner(uint256 tokenId) external view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenOwners[tokenId];
    }

    // ===== Human Verification Functions =====
    function isHuman(address user) external view returns (bool) {
        // Check if user has a token
        uint256 tokenId = _userTokenIds[user];
        if (tokenId == 0) {
            return false;
        }
        
        // Check if token still exists
        if (_ownerOf(tokenId) == address(0)) {
            return false;
        }
        
        return true;
    }
    
    function getUserTokenId(address user) external view returns (uint256) {
        return _userTokenIds[user];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function isHumanBatch(address[] calldata users) external view returns (bool[] memory results) {
        results = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            uint256 tokenId = _userTokenIds[users[i]];
            results[i] = tokenId != 0 && _ownerOf(tokenId) != address(0);
        }
        return results;
    }

    function tokenExists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedServerNonces[nonce];
    }

    function getTokenOwnerSafe(uint256 tokenId) external view returns (address owner) {
        return _tokenOwners[tokenId];
    }

    // ===== Soul Bound Token Overrides =====
    // Override transfer functions to make token non-transferable
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from = address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Allow burning (to = address(0)) - but only through our burn function
        if (to == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Revert all other transfers (Soul Bound)
        revert("Soul Bound Token: Transfer not allowed");
    }

    // ===== UUPS Storage Gap =====
    uint256[50] private __gap;
}
