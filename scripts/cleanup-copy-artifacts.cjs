#!/usr/bin/env node
/**
 * Clean doubled unit labels created by the interpolation rewriter.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HAN = /[\p{Script=Han}]/u;
const TARGETS = ["shared", "server/src", "client/src", "desktop/src"];
const SKIP = new Set(["node_modules", "dist", "locales"]);

function collect(target, output = []) {
  const absolute = path.join(ROOT, target);
  if (!fs.existsSync(absolute)) return output;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(absolute)) output.push(target);
    return output;
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(target, entry.name);
    if (SKIP.has(entry.name)) continue;
    if (entry.isDirectory()) collect(relative, output);
    else if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) output.push(relative);
  }
  return output;
}

function cleanup(source) {
  return source
    .replace(/Chapter\s+\$\{([^}]+)\}\s*chapter/g, "Chapter ${$1}")
    .replace(/Chapter\s+\{([^}]+)\}\s*chapter/g, "Chapter {$1}")
    .replace(/Volume\s+\$\{([^}]+)\}\s*volume/g, "Volume ${$1}")
    .replace(/Volume\s+\{([^}]+)\}\s*volume/g, "Volume {$1}")
    .replace(/Episode\s+\$\{([^}]+)\}\s*episode/g, "Episode ${$1}")
    .replace(/Episode\s+\{([^}]+)\}\s*episode/g, "Episode {$1}")
    .replace(/Panel\s+\$\{([^}]+)\}\s*panel/g, "Panel ${$1}")
    .replace(/Panel\s+\{([^}]+)\}\s*panel/g, "Panel {$1}")
    .replace(/Round\s+\$\{([^}]+)\}\s*round/g, "Round ${$1}")
    .replace(/Day\s+\$\{([^}]+)\}\s*day/g, "Day ${$1}")
    .replace(/Chapters\s+\$\{([^}]+)\}–\$\{([^}]+)\}\s*chapters/g, "Chapters ${$1}–${$2}")
    .replace(/Chapter\s{2,}\{ /g, "Chapter {")
    .replace(/ chapters节/g, " chapters")
    .replace(/Volume\s+\$\{([^}]+)\}\s*chapters节列表/g, "Volume ${$1} chapter list")
    .replace(/GeneratingVolume /g, "Generating Volume ")
    .replace(/No\.\s+(\$\{[^}]+\}|\d+)\s*chapters/g, "Chapters $1")
    .replace(/Recently seen: No\.\s+/g, "Recently seen: Chapter ");
}

let filesChanged = 0;
for (const file of TARGETS.flatMap((root) => collect(root))) {
  const absolute = path.join(ROOT, file);
  const source = fs.readFileSync(absolute, "utf8");
  const next = cleanup(source);
  if (next !== source) {
    fs.writeFileSync(absolute, next);
    filesChanged += 1;
  }
}

console.log(JSON.stringify({ filesChanged }, null, 2));
