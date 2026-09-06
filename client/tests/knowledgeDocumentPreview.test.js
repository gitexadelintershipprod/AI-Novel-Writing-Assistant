import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { formatStatus } from "../src/pages/knowledge/components/knowledgeRagUi.ts";

const source = fs.readFileSync(new URL("../src/pages/knowledge/components/KnowledgeDocumentDetailDialog.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Render the component tree with lightweight UI primitives and controlled hook state.
function renderPreview(length, { expanded = false, confirm = () => true } = {}) {
  let nextExpanded = expanded;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, {
    exports,
    window: { confirm },
    require(name) {
      if (name === "react") return { useState: () => [expanded, (update) => { nextExpanded = update(expanded); }] };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (name === "./knowledgeRagUi") return { formatStatus };
      if (name.startsWith("@/components/ui/")) return new Proxy({}, { get: (_, key) => key });
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const content = "ა".repeat(length);
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    if (typeof node.type === "function") return visit(node.type(node.props));
    nodes.push(node);
    visit(node.props?.children);
  }
  visit(exports.default({
    open: true,
    selectedDocumentId: "document-1",
    document: {
      title: "Reference material", status: "enabled", latestIndexStatus: "succeeded",
      versions: [{ id: "version-1", versionNumber: 1, isActive: true, charCount: length, content, createdAt: "2026-09-07T00:00:00Z" }],
    },
    recallQuery: "", recallResult: null,
  }));
  return { nodes, content, nextExpanded: () => nextExpanded };
}

test("document previews show complete English count labels and preserve Georgian content", () => {
  for (const length of [3001, 100001, 1602677]) {
    const { nodes, content } = renderPreview(length);
    const button = nodes.find((node) => node.type === "button");
    assert.equal(button.props.children, `Showing the first 3,000 characters. Show full text (${length.toLocaleString("en-US")} characters total)`);
    const preview = nodes.find((node) => node.type === "pre");
    assert.equal(preview.props.children[0], content.slice(0, 3000));
    assert.equal(preview.props.children[1], "…");
  }
  assert.equal(renderPreview(3000).nodes.some((node) => node.type === "button"), false);
});

test("large document expansion retains the confirmation safety guard in English", () => {
  let warning;
  const cancelled = renderPreview(100001, { confirm: (message) => { warning = message; return false; } });
  cancelled.nodes.find((node) => node.type === "button").props.onClick();
  assert.equal(warning, "This document contains 100,001 characters. Showing the full text may slow down this page. Continue?");
  assert.equal(cancelled.nextExpanded(), false);
  const accepted = renderPreview(100001);
  accepted.nodes.find((node) => node.type === "button").props.onClick();
  assert.equal(accepted.nextExpanded(), true);
  const full = renderPreview(3001, { expanded: true });
  assert.equal(full.nodes.find((node) => node.type === "button").props.children, "Collapse full text (3,001 characters total)");
  assert.equal(full.nodes.find((node) => node.type === "pre").props.children[0], full.content);
});

test("desktop navigation hides Drama and Comic Studio", () => {
  const sidebar = fs.readFileSync(new URL("../src/components/layout/Sidebar.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(sidebar, /items\.(drama|comic)|["']\/(drama|comic)["']/);
  assert.match(sidebar, /items\.creativeHub/);
  assert.match(sidebar, /items\.bookAnalysis/);
});
