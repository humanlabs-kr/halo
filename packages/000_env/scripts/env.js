#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// JSONC 파싱 함수
async function parseJSONC(content) {
  const stripJsonComments = (await import("strip-json-comments")).default;
  const withoutComments = stripJsonComments(content, { trailingCommas: true });
  return JSON.parse(withoutComments);
}

// 환경 변수를 .env 파일 형식으로 변환
function formatEnvVars(envVars) {
  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

// .env 파일 생성
function createEnvFile(filePath, content) {
  const dir = path.dirname(filePath);

  // 디렉토리가 없으면 생성하지 않고 경고만 출력
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory does not exist: ${dir}`);
    return;
  }

  fs.writeFileSync(filePath, content);
  console.log(`✅ Created: ${filePath}`);
}

// wrangler.jsonc 파일에서 vars 항목 삭제
async function cleanWranglerVars(wranglerPath) {
  if (!fs.existsSync(wranglerPath)) {
    return;
  }

  try {
    const wranglerContent = fs.readFileSync(wranglerPath, "utf8");
    const wranglerConfig = await parseJSONC(wranglerContent);

    if (wranglerConfig.vars) {
      delete wranglerConfig.vars;
      fs.writeFileSync(wranglerPath, JSON.stringify(wranglerConfig, null, 2));
      console.log(`✅ Cleaned vars from: ${wranglerPath}`);
    }

    if (wranglerConfig.env.staging && wranglerConfig.env.staging.vars) {
      delete wranglerConfig.env.staging.vars;
      fs.writeFileSync(wranglerPath, JSON.stringify(wranglerConfig, null, 2));
      console.log(`✅ Cleaned staging vars from: ${wranglerPath}`);
    }

    if (wranglerConfig.env.production && wranglerConfig.env.production.vars) {
      delete wranglerConfig.env.production.vars;
      fs.writeFileSync(wranglerPath, JSON.stringify(wranglerConfig, null, 2));
      console.log(`✅ Cleaned production vars from: ${wranglerPath}`);
    }
  } catch (error) {
    console.warn(
      `⚠️  Could not clean wrangler.jsonc: ${wranglerPath}`,
      error.message
    );
  }
}

// wrangler.jsonc 파일에 vars 항목 추가/업데이트
async function updateWranglerVars(wranglerPath, env, envVars) {
  if (!fs.existsSync(wranglerPath)) {
    console.warn(`⚠️  wrangler.jsonc not found: ${wranglerPath}`);
    return;
  }

  try {
    const wranglerContent = fs.readFileSync(wranglerPath, "utf8");
    const wranglerConfig = await parseJSONC(wranglerContent);

    wranglerConfig.env[env].vars = envVars;
    fs.writeFileSync(wranglerPath, JSON.stringify(wranglerConfig, null, 2));
    console.log(`✅ Updated vars in: ${wranglerPath}`);
  } catch (error) {
    console.warn(
      `⚠️  Could not update wrangler.jsonc: ${wranglerPath}`,
      error.message
    );
  }
}

// clean 명령어 실행
async function cleanCommand(envConfig) {
  console.log("🧹 Cleaning all environment files...");

  for (const [projectName, projectConfig] of Object.entries(
    envConfig.project
  )) {
    const projectPath = path.join(process.cwd(), "../../", projectConfig.path);
    console.log(`📁 Cleaning project: ${projectName} (${projectPath})`);

    // .env 파일들 삭제
    const envFiles = [
      ".env",
      ".env.staging",
      ".env.production",
      ".env.staging.json",
      ".env.production.json",
    ];
    envFiles.forEach((fileName) => {
      const filePath = path.join(projectPath, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted: ${filePath}`);
      }
    });

    // wrangler.jsonc의 vars 삭제
    const wranglerPath = path.join(projectPath, "wrangler.jsonc");
    await cleanWranglerVars(wranglerPath);
  }

  console.log("🎉 Clean completed!");
}

// generate 명령어 실행 (local 환경만)
async function generateCommand(envConfig, developerName) {
  console.log(
    `🚀 Generating local environment files for developer: ${developerName}`
  );

  for (const [projectName, projectConfig] of Object.entries(
    envConfig.project
  )) {
    const projectPath = path.join(process.cwd(), "../../", projectConfig.path);
    console.log(`📁 Processing project: ${projectName} (${projectPath})`);

    // .env (local) 파일 생성
    if (projectConfig.local) {
      let localEnvVars = { ...projectConfig.local };

      // local-override에서 개발자별 설정 병합
      const overrides =
        envConfig["local-override"]?.[developerName]?.[projectName];
      if (overrides) {
        localEnvVars = { ...localEnvVars, ...overrides };
      }

      const localEnvContent = formatEnvVars(localEnvVars);
      createEnvFile(path.join(projectPath, ".env"), localEnvContent);
    }

    console.log("");
  }

  console.log("🎉 Generate completed!");
}

// generate --ci 명령어 실행
async function generateCiCommand(envConfig, targetEnv) {
  if (!targetEnv || !["staging", "production"].includes(targetEnv)) {
    throw new Error(
      "❌ Environment name required after --ci flag. Use 'staging' or 'production'"
    );
  }

  console.log(`🏗️  CI mode: generating ${targetEnv} environment files`);

  for (const [projectName, projectConfig] of Object.entries(
    envConfig.project
  )) {
    const projectPath = path.join(process.cwd(), "../../", projectConfig.path);
    console.log(`📁 Processing project: ${projectName} (${projectPath})`);

    const envType = projectConfig["env-type"] || ".env";
    const envVars = projectConfig[targetEnv] || {};

    if (envType === "wrangler.jsonc") {
      // wrangler.jsonc인 경우 해당 환경의 vars만 추가
      const wranglerPath = path.join(projectPath, "wrangler.jsonc");

      if (Object.keys(envVars).length > 0) {
        await updateWranglerVars(wranglerPath, targetEnv, envVars);
      }
    } else if (envType === ".env") {
      // .env인 경우 해당 환경의 파일만 생성
      if (projectConfig[targetEnv]) {
        const envContent = formatEnvVars(projectConfig[targetEnv]);
        createEnvFile(path.join(projectPath, `.env.${targetEnv}`), envContent);
      }
    } else if (envType === "both") {
      // both인 경우 wrangler.jsonc와 .env 모두 생성
      const wranglerPath = path.join(projectPath, "wrangler.jsonc");

      // wrangler.jsonc에 vars 추가
      if (Object.keys(envVars).length > 0) {
        await updateWranglerVars(wranglerPath, targetEnv, envVars);
      }

      // .env 파일 생성 (확장자 없이)
      if (projectConfig[targetEnv]) {
        const envContent = formatEnvVars(projectConfig[targetEnv]);
        createEnvFile(path.join(projectPath, `.env`), envContent);
      }
    }

    console.log("");
  }

  console.log(`🎉 Generate --ci ${targetEnv} completed!`);
}

/**
 * node ./scripts/env.js clean
 *  - .env, .env.staging, .env.production 모두 삭제
 *  - wrangler.jsonc 내의 "vars" 항목 삭제
 * node ./scripts/env.js generate
 *  - env-type과 관계 없이, 모든 project에 대해 .env (local 환경 env 만 생성)
 * node ./scripts/env.js generate --ci staging
 *    - env-type="wrangler.jsonc" 인 경우, wrangler.jsonc 안에 staging vars 로 적어줌
 *    - env-type=".env" 인 경우, .env.staging 파일 생성
 *    - env-type="both" 인 경우, wrangler.jsonc 안에 staging vars 추가 + .env 파일 생성
 * node ./scripts/env.js generate --ci production
 *    - env-type="wrangler.jsonc" 인 경우, wrangler.jsonc 안에 production vars 로 적어줌
 *    - env-type=".env" 인 경우, .env.production 파일 생성
 *    - env-type="both" 인 경우, wrangler.jsonc 안에 production vars 추가 + .env 파일 생성
 */
async function main() {
  try {
    const command = process.argv[2];
    const isCiMode = process.argv.includes("--ci");

    // --ci 다음에 오는 환경 이름 추출
    let targetEnv = null;
    if (isCiMode) {
      const ciIndex = process.argv.indexOf("--ci");
      targetEnv = process.argv[ciIndex + 1];
    }

    // 설정 파일들 읽기
    const envJsoncPath = path.join(__dirname, "..", "env.jsonc");
    const myNamePath = path.join(__dirname, "..", ".mynameis");

    if (!fs.existsSync(envJsoncPath)) {
      console.error("❌ env.jsonc file not found");
      process.exit(1);
    }

    const envConfig = await parseJSONC(fs.readFileSync(envJsoncPath, "utf8"));

    if (command === "clean") {
      await cleanCommand(envConfig);
    } else if (command === "generate") {
      await cleanCommand(envConfig);
      if (isCiMode) {
        await generateCiCommand(envConfig, targetEnv);
      } else {
        if (!fs.existsSync(myNamePath)) {
          console.error("❌ .mynameis file not found");
          process.exit(1);
        }
        const developerName = fs.readFileSync(myNamePath, "utf8").trim();
        await generateCommand(envConfig, developerName);
      }
    } else {
      console.error("❌ Invalid command. Use 'clean' or 'generate'");
      console.log("Usage:");
      console.log("  node ./scripts/env.js clean");
      console.log("  node ./scripts/env.js generate");
      console.log("  node ./scripts/env.js generate --ci staging");
      console.log("  node ./scripts/env.js generate --ci production");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main();
}
