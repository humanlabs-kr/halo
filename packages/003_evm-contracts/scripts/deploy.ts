#!/usr/bin/env tsx

import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, defineAlchemyChain } from "@account-kit/infra";
import {
  createSmartWalletClient,
  SmartWalletClient,
  SmartWalletClientParams,
} from "@account-kit/wallet-client";
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import type { Hex, PublicClient } from "viem";
import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  getCreate2Address,
  http,
  keccak256,
  toBytes,
} from "viem";
import {
  CHAINS,
  CONTRACT_CONFIG,
  DeploymentConfig,
  ENV_KEYS,
  UD2_ADDRESS,
} from "./constants";
import { verifyAllAfterDeploy } from "./verify";

/* =========================
   Types
========================= */

type ProxyType = "deviceProxy" | "orbProxy" | "verifierProxy";

interface ContractArtifact {
  bytecode: { object: string };
  abi: Array<{
    type: string;
    name?: string;
    inputs?: Array<{ name: string; type: string }>;
  }>;
}

/* =========================
   Artifact helpers
========================= */
function loadContractBytecode(contractName: string): `0x${string}` {
  const artifactPath = join(
    __dirname,
    "..",
    "out",
    `${contractName}.sol`,
    `${contractName}.json`
  );
  try {
    const artifact: ContractArtifact = JSON.parse(
      readFileSync(artifactPath, "utf8")
    );
    return artifact.bytecode.object as `0x${string}`;
  } catch (error) {
    throw new Error(
      `Failed to load ${contractName} artifact from ${artifactPath}: ${error}`
    );
  }
}

function loadContractAbi(contractName: string) {
  const artifactPath = join(
    __dirname,
    "..",
    "out",
    `${contractName}.sol`,
    `${contractName}.json`
  );
  try {
    const artifact: ContractArtifact = JSON.parse(
      readFileSync(artifactPath, "utf8")
    );
    return artifact.abi;
  } catch (error) {
    throw new Error(
      `Failed to load ABI for ${contractName} from ${artifactPath}: ${error}`
    );
  }
}

/* =========================
   Misc helpers
========================= */

function loadConfig(chainId: number): DeploymentConfig {
  const chainConfig = CHAINS.get(chainId);
  if (!chainConfig)
    throw new Error(`Chain configuration not found for chainId: ${chainId}`);

  const alchemyApiKey = process.env[ENV_KEYS.ALCHEMY_API_KEY];
  const policyId = process.env[ENV_KEYS.ALCHEMY_POLICY_ID];
  const serverSignerAddress = process.env[ENV_KEYS.SERVER_SIGNER_ADDRESS];
  const deployerPrivateKey = process.env[ENV_KEYS.DEPLOYER_PRIVATE_KEY];
  const deployerAddress = process.env[ENV_KEYS.DEPLOYER_ADDRESS];

  if (
    !alchemyApiKey ||
    !policyId ||
    !serverSignerAddress ||
    !deployerPrivateKey ||
    !deployerAddress
  ) {
    throw new Error("Missing required environment variables");
  }

  return {
    deployerAddress: deployerAddress as `0x${string}`,
    privateKey: deployerPrivateKey as `0x${string}`,
    chain: chainConfig.chain,
    rpcUrl: `${chainConfig.rpcUrl}${alchemyApiKey}`,
    ud2Address: UD2_ADDRESS,
    policyId,
    serverSignerAddress: serverSignerAddress as `0x${string}`,
  };
}

async function createClients(config: DeploymentConfig) {
  const chain = defineAlchemyChain({
    chain: config.chain,
    rpcBaseUrl: config.rpcUrl,
  });

  const clientParams: SmartWalletClientParams = {
    transport: alchemy({ apiKey: process.env[ENV_KEYS.ALCHEMY_API_KEY]! }),
    chain,
    signer: LocalAccountSigner.privateKeyToAccountSigner(
      config.privateKey as Hex
    ),
    policyId: config.policyId,
  };

  const clientWithoutAccount = createSmartWalletClient(clientParams);
  const account = await clientWithoutAccount.requestAccount();

  const smartWalletClient = createSmartWalletClient({
    ...clientParams,
    account: account.address,
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });

  return { publicClient, smartWalletClient, account };
}

/* =========================
   UD2 deploy (generic)
========================= */

/**
 * Deploy an arbitrary initCode with CREATE2 through UD2.
 * - `initCode` must already include constructor encoding if any.
 */
async function deployUsingUD2(
  config: DeploymentConfig,
  smartWalletClient: SmartWalletClient<`0x${string}`>,
  publicClient: PublicClient,
  tag: string,
  initCode: `0x${string}`,
  salt: `0x${string}`,
  throwIfExists: boolean = false
) {
  console.log(`🚀 Starting ${tag} deployment via UD2...`);
  console.log(`📍 UD2 Address: ${config.ud2Address}`);
  console.log(`🔑 Salt: ${salt}`);
  console.log(`📦 InitCode length: ${initCode.length} chars`);

  // Predicted address from CREATE2
  const initCodeHash = keccak256(initCode);
  const predicted = getCreate2Address({
    from: config.ud2Address,
    salt,
    bytecodeHash: initCodeHash,
  });
  console.log(`🔍 Predicted address: ${predicted}`);

  const existingCode = await publicClient.getCode({ address: predicted });

  if (existingCode && existingCode !== "0x") {
    if (throwIfExists) {
      throw new Error(`${tag} deployment already exists at ${predicted}`);
    }
    console.log(`✅ ${tag} deployed at ${predicted}`);
    return predicted as `0x${string}`;
  }

  // UD2 deploy calldata
  const deployCallData = encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "deploy",
        stateMutability: "nonpayable",
        inputs: [
          { name: "_initCode", type: "bytes" },
          { name: "_salt", type: "bytes32" },
        ],
        outputs: [{ name: "createdContract", type: "address" }],
      },
    ] as const,
    functionName: "deploy",
    args: [initCode, salt],
  });

  const { preparedCallIds } = await smartWalletClient.sendCalls({
    capabilities: {
      gasParamsOverride: {
        // 넉넉한 초기값 — 이후 시뮬레이션으로 조정 권장
        callGasLimit: "0x2DC6C0", // 3,000,000
      },
    },
    calls: [{ to: config.ud2Address, value: "0x00", data: deployCallData }],
  });

  console.log(`🔗 Prepared Call IDs: ${preparedCallIds.join(", ")}`);
  console.log("⏳ Waiting for transaction confirmation...");

  const status = await smartWalletClient.waitForCallsStatus({
    id: preparedCallIds[0],
  });
  if (!status.receipts?.[0])
    throw new Error("Contract deployment failed - no receipt");

  // Verify code actually deployed
  const code = await publicClient.getCode({ address: predicted });
  if (!code || code === "0x") throw new Error(`${tag} deployment not found`);
  console.log(`✅ ${tag} deployed at ${predicted}`);

  return predicted as `0x${string}`;
}

/* =========================
   Build ERC1967Proxy initCode
========================= */

async function buildErc1967ProxyInitCode(
  proxyBytecode: `0x${string}`,
  implAddress: `0x${string}`,
  implAbi: any,
  initializeArgs:
    | [`0x${string}`, `0x${string}`, string, string]
    | [`0x${string}`, `0x${string}`, `0x${string}`]
): Promise<`0x${string}`> {
  // encode initialize(...) for implementation
  const initData = encodeFunctionData({
    abi: implAbi,
    functionName: "initialize", // 구현 컨트랙트의 초기화 함수명
    args: initializeArgs,
  });

  // ERC1967Proxy constructor: (address logic, bytes data)
  const ctorData = encodeAbiParameters(
    [{ type: "address" }, { type: "bytes" }],
    [implAddress, initData]
  );

  const initCode = (proxyBytecode + ctorData.slice(2)) as `0x${string}`;
  return initCode;
}

/* =========================
   High-level helpers
========================= */

async function deployImplementation(
  config: DeploymentConfig,
  smartWalletClient: SmartWalletClient<`0x${string}`>,
  publicClient: PublicClient,
  tag: "deviceImpl" | "orbImpl" | "verifierImpl",
  implBytecode: `0x${string}`,
  env: string
) {
  const salt = keccak256(toBytes(CONTRACT_CONFIG.salts[tag] + env)); // fixed salt → deterministic address
  // implementation has no constructor (upgradeable)
  return await deployUsingUD2(
    config,
    smartWalletClient,
    publicClient,
    tag,
    implBytecode,
    salt,
    false
  );
}

async function deployProxyViaUD2(
  config: DeploymentConfig,
  smartWalletClient: SmartWalletClient<`0x${string}`>,
  publicClient: PublicClient,
  proxyType: ProxyType,
  proxyInitCode: `0x${string}`,
  env: string
) {
  const salt = keccak256(toBytes(CONTRACT_CONFIG.salts[proxyType])); // fixed salt → deterministic address

  return await deployUsingUD2(
    config,
    smartWalletClient,
    publicClient,
    proxyType,
    proxyInitCode,
    salt,
    false
  );
}

/* =========================
   Orchestration
========================= */

/**
 * Implementation은 예상 주소에 이미 contract 가 있으면, 전체가 오류 던지고 종료
 * Proxy는 예상 주소에 이미 contract 가 있으면, implementation의 배포된 주소를 업데이트
 */
async function deployAllContracts(config: DeploymentConfig, env: string) {
  try {
    console.log(
      `🎯 HumanPass Contract Deployment Script - ${config.chain.name}`
    );
    console.log("================================================\n");

    const { publicClient, smartWalletClient } = await createClients(config);
    console.log("✅ Clients created");

    const results: Record<string, string> = {};

    // 1) Deploy Implementations
    console.log("📦 Deploying Device Implementation...");
    const deviceImplBytecode = loadContractBytecode(
      "HumanBoundTokenDeviceUpgradeable"
    );
    const deviceImpl = await deployImplementation(
      config,
      smartWalletClient,
      publicClient,
      "deviceImpl",
      deviceImplBytecode,
      env
    );
    results.deviceImpl = deviceImpl;

    console.log("\n📦 Deploying Orb Implementation...");
    const orbImplBytecode = loadContractBytecode(
      "HumanBoundTokenOrbUpgradeable"
    );
    const orbImpl = await deployImplementation(
      config,
      smartWalletClient,
      publicClient,
      "orbImpl",
      orbImplBytecode,
      env
    );
    results.orbImpl = orbImpl;

    console.log("\n📦 Deploying Verifier Implementation...");
    const verifierImplBytecode = loadContractBytecode(
      "HumanVerifierUpgradeable"
    );
    const verifierImpl = await deployImplementation(
      config,
      smartWalletClient,
      publicClient,
      "verifierImpl",
      verifierImplBytecode,
      env
    );
    results.verifierImpl = verifierImpl;

    // 2) Build Proxy initCodes
    const proxyBytecode = loadContractBytecode("ERC1967Proxy"); // ⚠️ 프록시 바이트코드 사용
    const deviceImplAbi = loadContractAbi("HumanBoundTokenDeviceUpgradeable");
    const orbImplAbi = loadContractAbi("HumanBoundTokenOrbUpgradeable");
    const verifierImplAbi = loadContractAbi("HumanVerifierUpgradeable");

    const owner = config.deployerAddress;
    const serverSigner = config.serverSignerAddress;

    console.log("\n🛠 Building Device Proxy initCode...");
    const deviceProxyInitCode = await buildErc1967ProxyInitCode(
      proxyBytecode,
      deviceImpl,
      deviceImplAbi,
      [
        owner,
        serverSigner,
        CONTRACT_CONFIG.device.name,
        CONTRACT_CONFIG.device.symbol,
      ]
    );

    console.log("🛠 Building Orb Proxy initCode...");
    const orbProxyInitCode = await buildErc1967ProxyInitCode(
      proxyBytecode,
      orbImpl,
      orbImplAbi,
      [
        owner,
        serverSigner,
        CONTRACT_CONFIG.orb.name,
        CONTRACT_CONFIG.orb.symbol,
      ]
    );

    // 3) Deploy Proxies via UD2
    console.log("\n📦 Deploying Device Proxy (deterministic)...");
    const deviceProxy = await deployProxyViaUD2(
      config,
      smartWalletClient,
      publicClient,
      "deviceProxy",
      deviceProxyInitCode,
      env
    );
    results.deviceProxy = deviceProxy;

    console.log("\n📦 Deploying Orb Proxy (deterministic)...");
    const orbProxy = await deployProxyViaUD2(
      config,
      smartWalletClient,
      publicClient,
      "orbProxy",
      orbProxyInitCode,
      env
    );
    results.orbProxy = orbProxy;

    // 4) Build and Deploy Verifier Proxy
    console.log("\n🛠 Building Verifier Proxy initCode...");
    const verifierProxyInitCode = await buildErc1967ProxyInitCode(
      proxyBytecode,
      verifierImpl,
      verifierImplAbi,
      [
        owner,
        deviceProxy, // deviceToken address
        orbProxy, // orbToken address
      ]
    );

    console.log("\n📦 Deploying Verifier Proxy (deterministic)...");
    const verifierProxy = await deployProxyViaUD2(
      config,
      smartWalletClient,
      publicClient,
      "verifierProxy",
      verifierProxyInitCode,
      env
    );
    results.verifierProxy = verifierProxy;

    // Summary
    console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=====================================");
    console.log(`Chain: ${config.chain.name} (${config.chain.id})`);
    console.log(`Device Implementation: ${results.deviceImpl}`);
    console.log(`Orb Implementation:    ${results.orbImpl}`);
    console.log(`Verifier Implementation: ${results.verifierImpl}`);
    console.log(`Device Proxy:          ${results.deviceProxy}`);
    console.log(`Orb Proxy:             ${results.orbProxy}`);
    console.log(`Verifier Proxy:        ${results.verifierProxy}`);

    return results;
  } catch (err) {
    console.error("❌ Deployment failed:", err);
    throw err;
  }
}

/* =========================
   CLI
========================= */

async function main() {
  const chainId = Number(process.argv[2]);
  const env = process.argv[3]; // local, staging, production

  if (!chainId) {
    console.error("❌ Please provide a chain id");
    process.exit(1);
  }

  if (!CHAINS.has(chainId)) {
    console.error(`❌ Unknown chain: ${chainId}`);
    process.exit(1);
  }

  if (!env) {
    console.error("❌ Please provide an environment");
    process.exit(1);
  }

  try {
    const config = loadConfig(chainId);

    const results = await deployAllContracts(config, env);

    await verifyAllAfterDeploy(config, results, config.serverSignerAddress);
  } catch (error) {
    console.error("💥 Unhandled error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
