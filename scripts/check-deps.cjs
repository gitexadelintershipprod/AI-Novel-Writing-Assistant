const fs = require("fs");
const path = require("path");

// Pre-start dependency check for people running from source (including non-developers).
// Only checks that direct dependencies exist (pnpm creates a node_modules symlink per workspace package).
// It does not compare versions — pnpm-lock.yaml owns that. This only catches "pulled new code, forgot pnpm install".

const ROOT = path.resolve(__dirname, "..");

const WORKSPACE_PACKAGES = [
  { name: "root", dir: "." },
  { name: "shared", dir: "shared" },
  { name: "server", dir: "server" },
  { name: "client", dir: "client" },
];

function collectMissingDeps(packageDir) {
  const packageJsonPath = path.join(ROOT, packageDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }
  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const declared = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
  };
  const nodeModulesDir = path.join(ROOT, packageDir, "node_modules");
  return Object.keys(declared).filter((depName) => {
    return !fs.existsSync(path.join(nodeModulesDir, ...depName.split("/")));
  });
}

const problems = [];
for (const pkg of WORKSPACE_PACKAGES) {
  const missing = collectMissingDeps(pkg.dir);
  if (missing.length > 0) {
    problems.push({ package: pkg.name, missing });
  }
}

if (problems.length === 0) {
  process.exit(0);
}

const lines = [
  "",
  "==============================================",
  "  Dependencies are missing or incomplete; the project cannot start yet",
  "==============================================",
  "",
  "Missing dependencies:",
];
for (const problem of problems) {
  const preview = problem.missing.slice(0, 5).join(", ");
  const suffix = problem.missing.length > 5 ? ` and ${problem.missing.length - 5} more` : "";
  lines.push(`  - [${problem.package}] ${preview}${suffix}`);
}
lines.push(
  "",
  "This is expected after a git pull that added packages: reinstall dependencies, then start again.",
  "From the project root, run:",
  "",
  "  pnpm install",
  "",
  "If pnpm is not installed, run: npm install -g pnpm",
  "",
);
console.error(lines.join("\n"));
process.exit(1);
