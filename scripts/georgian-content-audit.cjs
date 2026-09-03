const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const HAN_PATTERN = /[\p{Script=Han}]/u;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SCAN_TARGETS = [
  "server/src/prompting/prompts",
  "server/src/prompting/context",
  "server/src/prompting/templates/officialTemplates.ts",
  "server/src/prompting/workbench",
  "server/src/prompting/materials/NovelPromptMaterialExporter.ts",
  "server/src/prompting/addendums/PromptAddendumService.ts",
  "server/src/modules/novel/writing-platform/domain/officialWritingPlatformProfiles.ts",
  "server/src/modules/novel/short-story/application/shortStoryPromptContext.ts",
  "server/src/services/bootstrap/SystemResourceBootstrapService.ts",
  "server/src/services/novel/characterInfluence/CharacterInfluenceService.ts",
  "server/src/services/comic/comicStylePrompt.ts",
  "server/src/services/novel/director/idea/ideaContext.ts",
  "server/src/services/novel/director/runtime/novelDirectorHelpers.ts",
  "server/src/services/novel/bookFraming.ts",
  "server/src/services/novel/NovelContinuationService.ts",
  "server/src/services/novel/storyMacro/storyMacroPlanService.shared.ts",
  "server/src/services/novel/volume/chapterTitleDiversity.ts",
  "server/src/services/planner/plannerContextBlocks.ts",
  "server/src/services/planner/plannerPlanMetadata.ts",
  "server/src/services/planner/plannerPersistence.ts",
  "server/src/services/styleEngine/defaults.ts",
  "server/src/db/storyModeSeeds.ts",
  "shared/imagePrompt.ts",
];

function collectFiles(target, output = []) {
  const absolutePath = path.join(ROOT, target);
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    output.push(target);
    return output;
  }
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const relativePath = path.posix.join(target, entry.name);
    if (entry.isDirectory()) collectFiles(relativePath, output);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) output.push(relativePath);
  }
  return output;
}

function readStaticProperty(objectNode, propertyName) {
  for (const property of objectNode.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : "";
    if (name !== propertyName) continue;
    if (ts.isStringLiteralLike(property.initializer)) return property.initializer.text;
  }
  return null;
}

function scanSourceFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const sourceText = fs.readFileSync(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hanStrings = new Set();
  const promptAssets = [];
  const semanticViolations = [];

  function visit(node) {
    let value = null;
    if (ts.isStringLiteralLike(node) || ts.isIdentifier(node)) value = node.text;
    else if (ts.isRegularExpressionLiteral(node)) value = node.getText(sourceFile);

    if (typeof value === "string") {
      if (HAN_PATTERN.test(value)) hanStrings.add(value.trim());
      const normalized = value.replace(/\s+/g, " ").trim();
      const requestsChineseOutput = /(?:in concise Chinese|must be Chinese|uses? Chinese|Chinese (?:paragraphs?|text|prose|summary|points?|risks?|output|article|world|web[- ]?novel)|natural Chinese|Simplified Chinese)/i.test(normalized)
        && !/(?:do not|don't|never|without) (?:output |write |use )?Chinese/i.test(normalized);
      const usesChineseLengthSemantics = /Chinese characters|Han characters|[\p{Script=Han}](?:字数|字符数)|(?:字数|字符数)[\p{Script=Han}]/u.test(normalized);
      if (requestsChineseOutput || usesChineseLengthSemantics) {
        semanticViolations.push(normalized);
      }
    }

    if (ts.isObjectLiteralExpression(node)) {
      const id = readStaticProperty(node, "id");
      const language = readStaticProperty(node, "language");
      const mode = readStaticProperty(node, "mode");
      const taskType = readStaticProperty(node, "taskType");
      if (id && language && mode && taskType) promptAssets.push({ id, language });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return {
    path: relativePath,
    hanStrings: [...hanStrings].filter(Boolean).sort(),
    promptAssets,
    semanticViolations: [...new Set(semanticViolations)].sort(),
  };
}

function scanGeorgianContent() {
  return [...new Set(SCAN_TARGETS.flatMap((target) => collectFiles(target)))]
    .sort()
    .map(scanSourceFile);
}

module.exports = { ROOT, scanGeorgianContent };
