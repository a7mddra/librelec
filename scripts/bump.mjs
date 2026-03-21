import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const [, , target, version] = process.argv;

if (!target || !version) {
  console.error("\x1b[31mUsage: node scripts/bump.mjs <target> <version>\x1b[0m");
  process.exit(1);
}

// Load configuration
const configPath = path.resolve(process.cwd(), "pkg-tools.config.json");
let rawConfig = {};
if (fs.existsSync(configPath)) {
  try {
    rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    console.error(`\x1b[31mError parsing config file at ${configPath}\x1b[0m`);
    process.exit(1);
  }
}

const config = rawConfig[target];

if (!config) {
  console.error(`\x1b[31mError: Target "${target}" not found in pkg-tools.config.json\x1b[0m`);
  process.exit(1);
}

try {
  const status = execSync("git status --porcelain").toString().trim();
  if (status) {
    console.error(
      "\x1b[31mError: Git tree is dirty! Please commit or stash changes before bumping.\x1b[0m",
    );
    console.error(status);
    process.exit(1);
  }
} catch (e) {
  console.error("\x1b[31mFailed to check git status.\x1b[0m");
  process.exit(1);
}

console.log(`\x1b[36mBumping ${target.toUpperCase()} to v${version}...\x1b[0m`);

// Update JSON helper
function updateJson(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (data.version !== newVersion) {
    data.version = newVersion;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    console.log(`Updated ${filePath}`);
  }
}

try {
  // 1. Update bumpFiles (typically package.json, manifest.json)
  if (config.bumpFiles && Array.isArray(config.bumpFiles)) {
    for (const file of config.bumpFiles) {
      updateJson(file, version);
    }
  }

  // 2. Update versionFiles (plain text version files like VERSION)
  if (config.versionFiles && Array.isArray(config.versionFiles)) {
    for (const file of config.versionFiles) {
      fs.writeFileSync(file, version + "\n");
      console.log(`Updated ${file}`);
    }
  }

  // 3. Optional: update README.md asset URLs
  if (config.readmeAssetUrl) {
    const readmePath = "README.md";
    if (fs.existsSync(readmePath)) {
      let readme = fs.readFileSync(readmePath, "utf8");
      // Find where it matches the pattern (just ignoring the version part in the existing match)
      // e.g. releases/download/v[^\/]+/librelec-extension.zip
      // We will construct a regex from the config template.
      // This is a bit tricky to make fully generic, but we can do a simple replace if we know the old version,
      // or we can just stick to the specific regex logic if the user provides a regex, 
      // but for simplicity, let's keep the specific regex pattern from before but parameterized.
      // Better yet: replace `releases/download/v[^/]+/SOMETHING` based on the template.
      const assetFile = config.readmeAssetUrl.split("/").pop(); // librelec-extension.zip
      const safeAssetFile = assetFile.replace(/\./g, "\\.");
      const regex = new RegExp(`releases/download/v[^/]+/${safeAssetFile}`, "g");
      const urlWithVersion = config.readmeAssetUrl.replace("%VERSION%", version);
      
      const updatedReadme = readme.replace(regex, urlWithVersion);
      if (readme !== updatedReadme) {
        fs.writeFileSync(readmePath, updatedReadme);
        console.log(`Updated README.md release link`);
      }
    }
  }

  // 4. Format
  console.log(`\x1b[36mFormatting...\x1b[0m`);
  execSync("npm run format", { stdio: "inherit" });

  // 5. Build
  if (config.buildCommand) {
    console.log(`\x1b[36mBuilding ${target.toUpperCase()} to check for errors...\x1b[0m`);
    execSync(config.buildCommand, { stdio: "inherit" });
  }

  // 6. Git commit
  execSync("git add .", { stdio: "inherit" });
  const commitMsg = config.commitMessage
    ? config.commitMessage.replace("%VERSION%", version)
    : `chore(release): ${target} v${version}`;
  execSync(`git commit --allow-empty -m "${commitMsg}"`, { stdio: "inherit" });

  // 7. Git tag
  if (config.tagName) {
    const tag = config.tagName.replace("%VERSION%", version);
    execSync(`git tag ${tag}`, { stdio: "inherit" });
  }

  // 8. Git push main
  execSync("git push origin main", { stdio: "inherit" });

  // 9. Git push tag
  if (config.tagName) {
    const tag = config.tagName.replace("%VERSION%", version);
    execSync(`git push origin ${tag}`, { stdio: "inherit" });
  }

  // 10. Post-bump script (like publishing to npm)
  if (config.postBumpScript) {
    console.log(`\x1b[36mRunning post-bump script...\x1b[0m`);
    execSync(config.postBumpScript, { stdio: "inherit" });
  }

  console.log(`\x1b[32mSuccessfully bumped ${target.toUpperCase()} to v${version}!\x1b[0m`);
} catch (error) {
  console.error(`\x1b[31mAn error occurred during the bump process.\x1b[0m`);
  console.error(error.message);
  process.exit(1);
}
