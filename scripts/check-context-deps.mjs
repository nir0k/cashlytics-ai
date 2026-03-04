#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const filterId = args.find((arg) => !arg.startsWith("--")) ?? null;

const fixMode = flags.has("--fix");
const verboseMode = flags.has("--verbose");

const AGENT_GLOBS = [".claude/agents", ".claude/skills", ".claude/commands"];
const CONTEXT_ROOTS = [".planning/codebase", ".opencode/context", ".claude/context"];
const MAX_UNUSED_DISPLAY = 30;
const REGISTRY_CANDIDATES = ["registry.json", ".claude/registry.json"];

const CONTEXT_REFERENCE_REGEX =
  /(@?\.opencode\/context\/[\w./-]+\.md|\.planning\/[\w./-]+\.md|\.claude\/context\/[\w./-]+\.md|context:[\w./-]+)/g;

function normalizeDependency(raw) {
  const value = raw.trim();

  if (value.startsWith("context:")) {
    return value.replace(/\.md$/i, "");
  }

  const withoutAt = value.startsWith("@") ? value.slice(1) : value;
  const knownPrefixes = [".opencode/context/", ".planning/", ".claude/context/"];
  const prefix = knownPrefixes.find((item) => withoutAt.startsWith(item));

  if (!prefix) {
    return null;
  }

  const relative = withoutAt.slice(prefix.length).replace(/\.md$/i, "");

  if (!relative) {
    return null;
  }

  if (prefix === ".opencode/context/") {
    return `context:${relative}`;
  }

  if (prefix === ".planning/") {
    return `context:planning/${relative}`;
  }

  return `context:claude/${relative}`;
}

function dependencyToFilePath(dep) {
  if (!dep.startsWith("context:")) {
    return null;
  }

  const id = dep.slice("context:".length);

  if (id.startsWith("planning/")) {
    return `${id.replace(/^planning\//, ".planning/")}.md`;
  }

  if (id.startsWith("claude/")) {
    return `${id.replace(/^claude\//, ".claude/context/")}.md`;
  }

  return `.opencode/context/${id}.md`;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(cwd, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdownFiles(relativeDir) {
  const absoluteDir = path.join(cwd, relativeDir);
  const results = [];

  if (!(await exists(relativeDir))) {
    return results;
  }

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(path.relative(cwd, absolutePath));
      }
    }
  }

  await walk(absoluteDir);
  results.sort((a, b) => a.localeCompare(b));
  return results;
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return { exists: false, raw: "", start: 0, end: 0, lines: [], id: null, dependencies: [] };
  }

  const endMarker = content.indexOf("\n---", 4);
  if (endMarker === -1) {
    return { exists: false, raw: "", start: 0, end: 0, lines: [], id: null, dependencies: [] };
  }

  const frontmatterRaw = content.slice(4, endMarker + 1);
  const lines = frontmatterRaw.split("\n");
  let id = null;
  const dependencies = [];
  let inDependencies = false;

  for (const line of lines) {
    const idMatch = line.match(/^id:\s*(.+)$/);
    if (idMatch) {
      id = idMatch[1].trim();
      inDependencies = false;
      continue;
    }

    if (/^dependencies:\s*$/.test(line)) {
      inDependencies = true;
      continue;
    }

    if (inDependencies) {
      const depMatch = line.match(/^\s*-\s*(.+)$/);
      if (depMatch) {
        dependencies.push(depMatch[1].trim());
      } else if (/^\S/.test(line)) {
        inDependencies = false;
      }
    }
  }

  const end = endMarker + 4;
  return {
    exists: true,
    raw: frontmatterRaw,
    start: 0,
    end,
    lines,
    id,
    dependencies,
  };
}

function extractReferences(content) {
  const references = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matches = [...line.matchAll(CONTEXT_REFERENCE_REGEX)];

    for (const match of matches) {
      const raw = match[0];
      const normalized = normalizeDependency(raw);
      if (!normalized) {
        continue;
      }

      references.push({
        raw,
        normalized,
        line: index + 1,
      });
    }
  }

  return references;
}

function upsertDependenciesInContent(fileContent, fileId, missingDependencies) {
  const fm = parseFrontmatter(fileContent);

  if (!fm.exists) {
    const frontmatter = [
      "---",
      `id: ${fileId}`,
      "dependencies:",
      ...missingDependencies.map((d) => `  - ${d}`),
      "---",
      "",
    ];
    return `${frontmatter.join("\n")}${fileContent}`;
  }

  const lines = fm.lines.slice();
  const depIndex = lines.findIndex((line) => /^dependencies:\s*$/.test(line));

  if (depIndex === -1) {
    const injection = ["dependencies:", ...missingDependencies.map((d) => `  - ${d}`)];
    lines.push(...injection);
  } else {
    let insertIndex = depIndex + 1;
    while (insertIndex < lines.length && /^\s*-\s+/.test(lines[insertIndex])) {
      insertIndex += 1;
    }
    lines.splice(insertIndex, 0, ...missingDependencies.map((d) => `  - ${d}`));
  }

  const nextFrontmatter = `---\n${lines.join("\n")}\n---`;
  const remainder = fileContent.slice(fm.end);
  return `${nextFrontmatter}${remainder}`;
}

async function loadRegistry() {
  for (const candidate of REGISTRY_CANDIDATES) {
    if (!(await exists(candidate))) {
      continue;
    }

    try {
      const raw = await fs.readFile(path.join(cwd, candidate), "utf8");
      const parsed = JSON.parse(raw);
      return { path: candidate, data: parsed };
    } catch {
      return null;
    }
  }

  return null;
}

function getRegistryDependencies(registry, id) {
  if (!registry?.data?.components) {
    return [];
  }

  const buckets = [registry.data.components.agents, registry.data.components.subagents].filter(
    Array.isArray
  );

  for (const bucket of buckets) {
    const hit = bucket.find((item) => item?.id === id);
    if (hit && Array.isArray(hit.dependencies)) {
      return hit.dependencies;
    }
  }

  return [];
}

async function main() {
  const allAgentFilesNested = await Promise.all(AGENT_GLOBS.map((dir) => walkMarkdownFiles(dir)));
  const agentFiles = uniqueSorted(allAgentFilesNested.flat());

  const contextFilesNested = await Promise.all(CONTEXT_ROOTS.map((dir) => walkMarkdownFiles(dir)));
  const contextFiles = uniqueSorted(contextFilesNested.flat())
    .map((file) => normalizeDependency(file))
    .filter(Boolean);

  const registry = await loadRegistry();

  const agentReports = [];
  const globalUsage = new Map();
  const brokenReferences = [];
  const formatIssues = [];
  const updatedFiles = [];

  for (const file of agentFiles) {
    const raw = await fs.readFile(path.join(cwd, file), "utf8");
    const frontmatter = parseFrontmatter(raw);
    const fileId = (frontmatter.id || path.basename(file, ".md")).trim();

    if (filterId && fileId !== filterId && path.basename(file, ".md") !== filterId) {
      continue;
    }

    const references = extractReferences(raw);
    const usedDeps = uniqueSorted(references.map((item) => item.normalized));
    const declaredDeps = uniqueSorted(
      frontmatter.dependencies.filter((dep) => dep.startsWith("context:"))
    );

    for (const dep of frontmatter.dependencies) {
      if (!dep.startsWith("context:")) {
        continue;
      }
      if (!/^context:[\w./-]+$/.test(dep)) {
        formatIssues.push({ file, id: fileId, dependency: dep });
      }
    }

    const missingDeclared = usedDeps.filter((dep) => !declaredDeps.includes(dep));
    const missingFiles = [];

    for (const dep of usedDeps) {
      const target = dependencyToFilePath(dep);
      if (target && !(await exists(target))) {
        missingFiles.push(dep);
        brokenReferences.push({ file, id: fileId, dependency: dep });
      }

      globalUsage.set(dep, (globalUsage.get(dep) || 0) + 1);
    }

    const registryDeps = getRegistryDependencies(registry, fileId);
    const missingRegistry = usedDeps.filter((dep) => !registryDeps.includes(dep));

    agentReports.push({
      id: fileId,
      file,
      usedDeps,
      declaredDeps,
      missingDeclared,
      missingFiles,
      missingRegistry,
      references,
    });

    if (fixMode && missingDeclared.length > 0) {
      const next = upsertDependenciesInContent(raw, fileId, missingDeclared);
      if (next !== raw) {
        await fs.writeFile(path.join(cwd, file), next, "utf8");
        updatedFiles.push({ file, added: missingDeclared });
      }
    }
  }

  const usedDepsSet = new Set([...globalUsage.keys()]);
  const unusedContextFiles = contextFiles.filter((dep) => !usedDepsSet.has(dep));

  const relevantReports = agentReports.sort((a, b) => a.id.localeCompare(b.id));
  const missingDependencyAgents = relevantReports.filter(
    (agent) => agent.missingDeclared.length > 0
  );

  console.log("# Context Dependency Analysis Report (.claude-adapted)");
  console.log("");
  console.log("## Summary");
  console.log(`- Agents/skills scanned: ${relevantReports.length}`);
  console.log(`- Context files referenced: ${usedDepsSet.size}`);
  console.log(`- Missing dependency declarations: ${missingDependencyAgents.length}`);
  console.log(`- Unused context files: ${unusedContextFiles.length}`);
  console.log(`- Broken references: ${brokenReferences.length}`);
  console.log(`- Format inconsistencies: ${formatIssues.length}`);
  console.log(
    `- Registry file: ${registry?.path ? registry.path : "not found (registry validation skipped)"}`
  );

  if (missingDependencyAgents.length > 0) {
    console.log("\n## Missing Dependencies");
    for (const agent of missingDependencyAgents) {
      console.log(`\n### ${agent.id}`);
      console.log(`- File: ${agent.file}`);
      console.log(`- Missing: ${agent.missingDeclared.join(", ")}`);
      if (verboseMode) {
        for (const dep of agent.missingDeclared) {
          const refs = agent.references.filter((ref) => ref.normalized === dep);
          for (const ref of refs) {
            console.log(`  - ${agent.file}:${ref.line} -> ${ref.raw}`);
          }
        }
      }
    }
  }

  if (brokenReferences.length > 0) {
    console.log("\n## Broken References");
    for (const item of brokenReferences) {
      console.log(`- ${item.id} (${item.file}) -> ${item.dependency}`);
    }
  }

  if (unusedContextFiles.length > 0) {
    console.log("\n## Unused Context Files");
    for (const dep of unusedContextFiles.slice(0, MAX_UNUSED_DISPLAY)) {
      console.log(`- ${dep}`);
    }
    if (unusedContextFiles.length > MAX_UNUSED_DISPLAY) {
      console.log(`- ... and ${unusedContextFiles.length - MAX_UNUSED_DISPLAY} more`);
    }
  }

  if (registry?.path) {
    const registryMisses = relevantReports.filter((item) => item.missingRegistry.length > 0);
    if (registryMisses.length > 0) {
      console.log("\n## Missing Registry Dependencies");
      for (const item of registryMisses) {
        console.log(`- ${item.id}: ${item.missingRegistry.join(", ")}`);
      }
    }
  }

  if (fixMode) {
    console.log("\n## Fixes Applied");
    if (updatedFiles.length === 0) {
      console.log("- No files required updates.");
    } else {
      for (const update of updatedFiles) {
        console.log(`- ${update.file}`);
        console.log(`  + Added: ${update.added.join(", ")}`);
      }
    }
  }

  if (!fixMode && missingDependencyAgents.length > 0) {
    console.log(
      "\nNext: run `node scripts/check-context-deps.mjs --fix` to auto-add missing frontmatter dependencies."
    );
  }
}

main().catch((error) => {
  console.error("check-context-deps failed:", error);
  process.exitCode = 1;
});
