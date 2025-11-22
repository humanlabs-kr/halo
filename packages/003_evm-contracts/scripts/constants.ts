/**
 * Chain Configuration Constants
 * 각 체인별 RPC URL과 UD2 컨트랙트 주소를 관리
 * 새로운 체인을 추가하려면 이 파일을 수정하세요.
 */

import type { Chain } from "viem";
export * from "../dist/chain";

export interface DeploymentConfig {
  deployerAddress: `0x${string}`;
  privateKey: `0x${string}`;
  chain: Chain;
  rpcUrl: string;
  ud2Address: `0x${string}`;
  policyId: string;
  serverSignerAddress: `0x${string}`;
}

export const UD2_ADDRESS = "0xce0042B868300000d44A59004Da54A005ffdcf9f";
// 체인별 설정

// 배포할 컨트랙트 설정
export const CONTRACT_CONFIG = {
  // Salt 값들 (Proxy만 체인별로 동일한 주소를 보장)
  salts: {
    deviceProxy: "HumanBoundTokenDeviceProxy_20251102",
    orbProxy: "HumanBoundTokenOrbProxy_20251102",
    verifierProxy: "HumanVerifierProxy_20251102",
    // 컨트랙트 업데이트 시에는 아래 부분만 salt 값 바꿔서 다시 deploy 하면 됨
    deviceImpl: "HumanBoundTokenDeviceImpl_20251102",
    orbImpl: "HumanBoundTokenOrbImpl_20251102",
    verifierImpl: "HumanVerifierImpl_20251102",
  },

  // 컨트랙트 이름과 심볼
  device: {
    name: "Human Device Token",
    symbol: "HDT",
  },

  orb: {
    name: "Human Orb Token",
    symbol: "HOT",
  },
} as const;

// 환경 변수 키
export const ENV_KEYS = {
  ALCHEMY_API_KEY: "ALCHEMY_API_KEY",
  SERVER_SIGNER_ADDRESS: "SERVER_SIGNER_ADDRESS",
  ALCHEMY_POLICY_ID: "ALCHEMY_POLICY_ID",
  DEPLOYER_PRIVATE_KEY: "DEPLOYER_PRIVATE_KEY",
  DEPLOYER_ADDRESS: "DEPLOYER_ADDRESS",
} as const;
