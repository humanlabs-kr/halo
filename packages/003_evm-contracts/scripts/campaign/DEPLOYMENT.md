```bash
source .env
```

## Deploy

```bash
forge script scripts/campaign/Deploy.s.sol:Deploy \
  --rpc-url $WORLD_CHAIN_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --chain 480
```

**Note:** Before deploying, make sure to update the `LINK_VAULT_ADDRESS` constant in `Deploy.s.sol` with the deployed link vault proxy address.

## Verify

```bash
CAMPAIGN_IMPLEMENTATION_ADDRESS=0x78b21c0B4037a7869fbFB3EF236Bbaa602f4796B
CAMPAIGN_PROXY_ADDRESS=0xb835FeF80b009419A5c2c09FE4f3EA1D519c82b5
# Verify Implementation (no constructor args needed)
forge verify-contract \
  --chain 480 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  $CAMPAIGN_IMPLEMENTATION_ADDRESS \
  src/HumanPassCampaignUpgradeable.sol:HumanPassCampaignUpgradeable

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
  --constructor-args $(cast abi-encode "constructor(address,bytes)" $CAMPAIGN_IMPLEMENTATION_ADDRESS $INIT_DATA) \
  $CAMPAIGN_PROXY_ADDRESS \
  node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy
```

## Upgrade

```bash
# 환경 변수 설정
export CAMPAIGN_PROXY_ADDRESS=0x0000000000000000000000000000000000000000

# 업그레이드 실행
forge script scripts/campaign/Upgrade.s.sol:Upgrade \
  --rpc-url $WORLD_CHAIN_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --chain 480
```

## Verify after upgrade

```bash
CAMPAIGN_IMPLEMENTATION_ADDRESS=0x0000000000000000000000000000000000000000
CAMPAIGN_PROXY_ADDRESS=0x0000000000000000000000000000000000000000

# Verify Implementation (no constructor args needed)
forge verify-contract \
  --chain 480 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  $CAMPAIGN_IMPLEMENTATION_ADDRESS \
  src/HumanPassCampaignUpgradeable.sol:HumanPassCampaignUpgradeable

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
  --constructor-args $(cast abi-encode "constructor(address,bytes)" $CAMPAIGN_IMPLEMENTATION_ADDRESS $INIT_DATA) \
  $CAMPAIGN_PROXY_ADDRESS \
  node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy
```
