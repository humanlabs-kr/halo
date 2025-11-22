```bash
source .env
```

## Deploy

```bash
forge script scripts/link-vault/Deploy.s.sol:Deploy \
  --rpc-url $WORLD_CHAIN_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --chain 480
```

## Verify

```bash
VAULT_IMPLEMENTATION_ADDRESS=0x0884f945C2713A67aEf5B3826Bf3621063e073cE
VAULT_PROXY_ADDRESS=0xD9fD104114549833E954EB3CAF7F94B42Ad913a0
# Verify Implementation (no constructor args needed)
forge verify-contract \
  --chain 480 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  $VAULT_IMPLEMENTATION_ADDRESS \
  src/HumanPassLinkVaultUpgradeable.sol:HumanPassLinkVaultUpgradeable

# Verify Proxy (requires implementation address and init data)
# Note: ERC1967Proxy is a standard OpenZeppelin contract and may already be verified on the chain.
# If verification is needed, use the full path:
# First, encode the initialize function call
INIT_DATA=$(cast calldata "initialize(address,address)" $OWNER_ADDRESS $SERVER_SIGNER_ADDRESS)

# Then verify the proxy with constructor args
# ERC1967Proxy constructor: (address implementation, bytes memory _data)
forge verify-contract \
  --chain 480 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,bytes)" $VAULT_IMPLEMENTATION_ADDRESS $INIT_DATA) \
  $VAULT_PROXY_ADDRESS \
  node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy
```

## Upgrade

```bash
# 환경 변수 설정
export VAULT_PROXY_ADDRESS=0x672CcB5bdAd553dbee04793b0e97ba07fA5C06B1

# 업그레이드 실행
forge script scripts/link-vault/Upgrade.s.sol:Upgrade \
  --rpc-url $WORLD_CHAIN_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --chain 480
```

## Verify after upgrade

```bash
VAULT_IMPLEMENTATION_ADDRESS=0xd064ECdee248386d8324110fECfD78dCb0921184
VAULT_PROXY_ADDRESS=0x27734De64DB8444025db46f5Bd791F030d6fae86

# Verify Implementation (no constructor args needed)
forge verify-contract \
  --chain 480 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  $VAULT_IMPLEMENTATION_ADDRESS \
  src/HumanPassLinkVaultUpgradeable.sol:HumanPassLinkVaultUpgradeable

# Verify Proxy (requires implementation address and init data)
# Note: ERC1967Proxy is a standard OpenZeppelin contract and may already be verified on the chain.
# If verification is needed, use the full path:
# First, encode the initialize function call
INIT_DATA=$(cast calldata "initialize(address,address)" $OWNER_ADDRESS $SERVER_SIGNER_ADDRESS)

# Then verify the proxy with constructor args
# ERC1967Proxy constructor: (address implementation, bytes memory _data)
forge verify-contract \
  --chain 480 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,bytes)" $VAULT_IMPLEMENTATION_ADDRESS $INIT_DATA) \
  $VAULT_PROXY_ADDRESS \
  node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy
```
