import fs from "node:fs";
import { execSync } from "node:child_process";

const [, , target] = process.argv;

const PACKAGE_NAME = "@a7mddra/libre-lec";

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

try {
  ensureCleanGitTree();

  console.log("\x1b[36mBuilding TUI before publish...\x1b[0m");
  run("npm run build:tui");

  console.log(
    `\x1b[36mPublishing ${PACKAGE_NAME} to PUBLIC npm registry...\x1b[0m`,
  );
  // Using --access public is required for scoped packages on NPM
  run(`npm publish --workspace ${PACKAGE_NAME} --access public --registry=https://registry.npmjs.org/`);

  console.log(
    `\x1b[36mPublishing ${PACKAGE_NAME} to GitHub Packages...\x1b[0m`,
  );
  run(`npm publish --workspace ${PACKAGE_NAME} --registry=https://npm.pkg.github.com/`);

  console.log(
    `\x1b[32mSuccessfully published ${PACKAGE_NAME} to BOTH npmjs.com and GitHub Packages!\x1b[0m`,
  );
} catch (error) {
  console.error("\x1b[31mAn error occurred during publish.\x1b[0m");
  console.error(error.message);
  process.exit(1);
}
