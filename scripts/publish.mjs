import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const [, , target] = process.argv;

const NPM_PACKAGE_NAME = process.env.LIBRE_LEC_NPM_NAME || "libre-lec";
const GITHUB_SCOPE = process.env.LIBRE_LEC_GITHUB_SCOPE || "@a7mddra";
const GITHUB_REGISTRY = "https://npm.pkg.github.com";
const GITHUB_PACKAGE_NAME = `${GITHUB_SCOPE}/${NPM_PACKAGE_NAME}`;
const TUI_PACKAGE_DIR = "packages/tui";
const TUI_PACKAGE_JSON = path.join(TUI_PACKAGE_DIR, "package.json");

if (!target) {
  console.error("\x1b[31mUsage: node scripts/publish.mjs <tui>\x1b[0m");
  process.exit(1);
}

if (target !== "tui") {
  console.error('\x1b[31mError: Target must be "tui"\x1b[0m');
  process.exit(1);
}

function ensureCleanGitTree() {
  try {
    const status = execSync("git status --porcelain").toString().trim();
    if (status) {
      console.error(
        "\x1b[31mError: Git tree is dirty! Please commit or stash changes before publishing.\x1b[0m",
      );
      console.error(status);
      process.exit(1);
    }
  } catch {
    console.error("\x1b[31mFailed to check git status.\x1b[0m");
    process.exit(1);
  }
}

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function buildGithubPackageCopy() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "libre-lec-gh-publish-"));
  const tmpPackageDir = path.join(tmpRoot, "tui");

  fs.cpSync(TUI_PACKAGE_DIR, tmpPackageDir, { recursive: true });

  const packageJsonPath = path.join(tmpPackageDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.name = GITHUB_PACKAGE_NAME;
  packageJson.publishConfig = { registry: GITHUB_REGISTRY };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

  return { tmpRoot, tmpPackageDir };
}

try {
  ensureCleanGitTree();

  const tuiPackage = JSON.parse(fs.readFileSync(TUI_PACKAGE_JSON, "utf8"));
  if (tuiPackage.name !== NPM_PACKAGE_NAME) {
    console.warn(
      `\x1b[33mWarning: ${TUI_PACKAGE_JSON} name is "${tuiPackage.name}" but LIBRE_LEC_NPM_NAME is "${NPM_PACKAGE_NAME}".\x1b[0m`,
    );
  }

  console.log("\x1b[36mBuilding TUI before publish...\x1b[0m");
  run("npm run build:tui");

  console.log(`\x1b[36mPublishing ${NPM_PACKAGE_NAME} to npm registry...\x1b[0m`);
  run("npm login");
  run(`npm publish --workspace ${NPM_PACKAGE_NAME}`);

  console.log(`\x1b[36mPreparing scoped package ${GITHUB_PACKAGE_NAME} for GitHub Packages...\x1b[0m`);
  const { tmpRoot, tmpPackageDir } = buildGithubPackageCopy();

  try {
    run(`npm login --scope=${GITHUB_SCOPE} --registry=${GITHUB_REGISTRY}`);
    run(`npm publish ${tmpPackageDir} --registry=${GITHUB_REGISTRY}`);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log(
    `\x1b[32mSuccessfully published ${NPM_PACKAGE_NAME} to npm and ${GITHUB_PACKAGE_NAME} to GitHub Packages.\x1b[0m`,
  );
} catch (error) {
  console.error("\x1b[31mAn error occurred during publish.\x1b[0m");
  console.error(error.message);
  process.exit(1);
}
