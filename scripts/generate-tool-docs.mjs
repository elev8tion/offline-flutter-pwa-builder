import { existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registryPath = path.resolve(__dirname, "../dist/tools/registry.js");
const outputPath = path.resolve(__dirname, "../docs/tools-registry.md");

if (!existsSync(registryPath)) {
  console.error("dist/tools/registry.js not found. Run `npm run build` first.");
  process.exit(1);
}

const { TOOL_DEFINITIONS, TOOL_GROUPS } = await import(registryPath);

const groupOrder = [
  "core",
  "drift",
  "pwa",
  "state",
  "security",
  "build",
  "testing",
  "performance",
  "accessibility",
  "api",
  "design",
  "analysis",
  "github",
  "aliases",
];

const lines = [];
lines.push("# MCP Tool Registry");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push(`Total tools: ${TOOL_DEFINITIONS.length}`);
lines.push("");
lines.push("## Counts By Group");
lines.push("");
lines.push("| Group | Count |");
lines.push("| --- | ---: |");

for (const group of groupOrder) {
  const tools = TOOL_GROUPS[group] || [];
  lines.push(`| ${group} | ${tools.length} |`);
}

for (const group of groupOrder) {
  const tools = TOOL_GROUPS[group] || [];
  if (tools.length === 0) continue;

  lines.push("");
  lines.push(`## ${group}`);
  lines.push("");
  lines.push("| Tool | Description |");
  lines.push("| --- | --- |");

  for (const tool of tools) {
    lines.push(`| \`${tool.name}\` | ${tool.description} |`);
  }
}

writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
