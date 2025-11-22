import { execSync } from "child_process";
import { DeploymentConfig } from "./constants";

/* ============================================================
   CONTRACT VERIFICATION HELPERS
   ============================================================ */

interface VerifyOptions {
  chainId: number;
  apiKey: string;
  implAddr?: string;
  proxyAddr?: string;
  implFile?: string;
  proxyFile?: string;
  owner?: string;
  serverSigner?: string;
  name?: string;
  symbol?: string;
}

/**
 * 실행 헬퍼
 */
function run(cmd: string) {
  console.log(`$ ${cmd}`);
  try {
    const out = execSync(cmd, { stdio: "inherit" });
    return out?.toString() ?? "";
  } catch (err: any) {
    console.error(`❌ Verification failed: ${err.message}`);
    throw err;
  }
}

/**
 * Implementation 검증
 */
export function verifyImplementation(opts: VerifyOptions) {
  if (!opts.implAddr || !opts.implFile)
    throw new Error("implAddr and implFile required");

  const verifierArg = `--etherscan-api-key ${opts.apiKey}`;

  const cmd = `forge verify-contract --chain ${opts.chainId} ${verifierArg} "${opts.implAddr}" ${opts.implFile}`;
  run(cmd);
}

/* ============================================================
   DEPLOYMENT POST-VERIFY LOGIC
   ============================================================ */

export async function verifyAllAfterDeploy(
  config: DeploymentConfig,
  results: Record<string, string>,
  owner: `0x${string}`
) {
  console.log("\n🔍 Starting post-deployment verification...");

  const chainId = config.chain.id;
  const apiKey =
    process.env[`${config.chain.name.toUpperCase()}_API_KEY`] ??
    process.env.ETHERSCAN_API_KEY;

  if (!apiKey) {
    console.warn(
      `⚠️  No API key found for ${config.chain.name}, skipping verification`
    );
    return;
  }

  const commonOpts = {
    chainId,
    apiKey,
    owner,
    serverSigner: config.serverSignerAddress,
    verifier: "sourcify" as const,
  };

  // Device Impl
  verifyImplementation({
    ...commonOpts,
    implAddr: results.deviceImpl,
    implFile:
      "src/HumanBoundTokenDeviceUpgradeable.sol:HumanBoundTokenDeviceUpgradeable",
  });

  // Orb Impl
  verifyImplementation({
    ...commonOpts,
    implAddr: results.orbImpl,
    implFile:
      "src/HumanBoundTokenOrbUpgradeable.sol:HumanBoundTokenOrbUpgradeable",
  });

  // Verifier Impl
  verifyImplementation({
    ...commonOpts,
    implAddr: results.verifierImpl,
    implFile: "src/HumanVerifierUpgradeable.sol:HumanVerifierUpgradeable",
  });

  console.log("✅ Verification phase completed.");
}
