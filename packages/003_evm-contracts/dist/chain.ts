import {
  arbitrum,
  base,
  defineAlchemyChain,
  mainnet,
  optimism,
  polygon,
  unichainMainnet,
  worldChain,
} from "@account-kit/infra";
import type { Chain } from "viem";
import { bsc } from "viem/chains";

export interface ChainConfig {
  chain: Chain;
  rpcUrl: string;
  explorerUrl?: string;
  isTestnet?: boolean;
}

export const CHAINS: Map<number, ChainConfig> = new Map()
  .set(480, {
    chain: worldChain,
    rpcUrl: "https://worldchain-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://worldchain.io",
    isTestnet: false,
  })
  .set(1, {
    chain: mainnet,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://etherscan.io",
    isTestnet: false,
  })
  .set(8453, {
    chain: base,
    rpcUrl: "https://base-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://basescan.org",
    isTestnet: false,
  })
  .set(56, {
    chain: defineAlchemyChain({
      chain: bsc,
      rpcBaseUrl: "https://bnb-mainnet.g.alchemy.com/v2/",
    }),
    rpcUrl: "https://bnb-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://bscscan.com",
    isTestnet: false,
  })
  .set(10, {
    chain: optimism,
    rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://optimistic.etherscan.io",
    isTestnet: false,
  })
  .set(42161, {
    chain: arbitrum,
    rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://arbiscan.io",
    isTestnet: false,
  })
  .set(137, {
    chain: polygon,
    rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://polygonscan.com",
    isTestnet: false,
  })
  .set(130, {
    chain: unichainMainnet,
    rpcUrl: "https://unichain-mainnet.g.alchemy.com/v2/",
    explorerUrl: "https://uniscan.xyz",
    isTestnet: false,
  });
