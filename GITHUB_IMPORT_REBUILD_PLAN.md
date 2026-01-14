# GitHub Import & Rebuild - Subagent Orchestration Playbook

## Orchestration Protocol

This document defines how to orchestrate multiple subagents to implement the GitHub Import & Rebuild feature while managing token context windows effectively.

---

## Token Management Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUBAGENT TOKEN PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Each subagent receives ONLY the context needed for its specific task    │
│  2. Maximum task scope: 2-3 files creation OR 3-4 files modification        │
│  3. Before spawning: Provide summary of previous agent's completed work     │
│  4. After completion: Agent reports files created/modified + verification   │
│  5. Orchestrator confirms phase complete before next spawn                  │
│                                                                             │
│  HANDOFF FORMAT:                                                            │
│  - Files created: [list with paths]                                         │
│  - Files modified: [list with paths and line ranges]                        │
│  - Key exports: [functions/classes available for next agent]                │
│  - Verification: [how to confirm work is correct]                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview

| Phase | Subagents | Focus | Estimated Tokens |
|-------|-----------|-------|------------------|
| 1 | 2 | Foundation & Module Setup | ~15K each |
| 2 | 2 | Git Clone & Pubspec Parsing | ~15K each |
| 3 | 4 | Deep Analysis (Parallel) | ~12K each |
| 4 | 2 | Transform & Schema | ~15K each |
| 5 | 2 | Rebuild Execution | ~15K each |
| 6 | 1 | Integration & Testing | ~20K |

**Total: 13 subagent spawns**

---

## PHASE 1: Foundation & Module Setup

### Subagent 1A: Create Module Structure

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Create the GitHub module structure for offline-flutter-pwa-builder

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

Create these files:

1. src/modules/github/index.ts
   - Module definition following pattern from src/modules/drift/index.ts
   - Module ID: "github"
   - Module name: "GitHub Import"
   - Export: GithubModule, GITHUB_TOOLS

2. src/modules/github/config.ts
   - All TypeScript interfaces (copy from section below)
   - Zod schemas for tool validation
   - Constants

3. src/modules/github/hooks.ts
   - Empty lifecycle hooks (onInstall, onGenerate, etc.)

INTERFACES TO CREATE IN config.ts:

interface CloneResult {
  success: boolean;
  localPath: string;
  repoName: string;
  branch: string;
  commit: string;
  size: number;
}

interface FolderNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: FolderNode[];
  fileType?: 'dart' | 'yaml' | 'json' | 'asset' | 'other';
  category?: 'model' | 'screen' | 'widget' | 'provider' | 'service' | 'theme' | 'route' | 'config' | 'unknown';
}

interface FieldDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  annotations: string[];
}

interface ModelDefinition {
  name: string;
  filePath: string;
  fields: FieldDefinition[];
  annotations: string[];
  relationships: Array<{
    type: 'hasOne' | 'hasMany' | 'belongsTo';
    target: string;
    fieldName: string;
  }>;
  isImmutable: boolean;
  hasJson: boolean;
}

interface ScreenDefinition {
  name: string;
  filePath: string;
  type: 'stateful' | 'stateless' | 'hook';
  route?: string;
  scaffold: {
    hasAppBar: boolean;
    hasBottomNav: boolean;
    hasDrawer: boolean;
    hasFab: boolean;
  };
  providers: string[];
  widgets: string[];
  layout: 'column' | 'row' | 'stack' | 'list' | 'grid' | 'custom';
}

interface WidgetDefinition {
  name: string;
  filePath: string;
  type: 'stateful' | 'stateless' | 'hook';
  props: FieldDefinition[];
  isReusable: boolean;
}

interface AnalysisResult {
  name: string;
  description: string;
  flutterVersion: string;
  dartVersion: string;
  architecture: {
    detected: 'clean' | 'feature-first' | 'layer-first' | 'custom';
    confidence: number;
    structure: FolderNode;
  };
  dependencies: {
    stateManagement: 'riverpod' | 'bloc' | 'provider' | 'getx' | 'mobx' | 'none';
    database: 'drift' | 'sqflite' | 'hive' | 'isar' | 'none';
    networking: 'dio' | 'http' | 'chopper' | 'retrofit' | 'none';
    navigation: 'go_router' | 'auto_route' | 'navigator' | 'none';
  };
  models: ModelDefinition[];
  screens: ScreenDefinition[];
  widgets: WidgetDefinition[];
  stats: {
    totalFiles: number;
    dartFiles: number;
    testFiles: number;
    linesOfCode: number;
  };
}

interface RebuildSchema {
  projectDefinition: any;  // Will use existing ProjectDefinition
  migrations: {
    models: any[];
    screens: any[];
    widgets: any[];
  };
  generationPlan: {
    theme: string[];
    models: string[];
    screens: string[];
    widgets: string[];
    state: string[];
  };
  preservedFiles: string[];
  warnings: string[];
}

ZOD SCHEMAS TO CREATE:

const GithubCloneRepositorySchema = z.object({
  url: z.string().url(),
  branch: z.string().default('main'),
  depth: z.number().default(1),
});

const GithubAnalyzeProjectSchema = z.object({
  localPath: z.string(),
  analyzeDepth: z.enum(['shallow', 'medium', 'deep']).default('deep'),
});

const GithubCreateRebuildSchemaSchema = z.object({
  analysisResult: z.any(),
  options: z.object({
    keepModels: z.boolean().default(true),
    keepScreenStructure: z.boolean().default(true),
    applyEdcDesign: z.boolean().default(true),
    addOfflineSupport: z.boolean().default(true),
    targetArchitecture: z.enum(['clean', 'feature-first', 'layer-first', 'keep']).default('keep'),
    targetStateManagement: z.enum(['riverpod', 'bloc', 'keep']).default('keep'),
  }).optional(),
});

const GithubRebuildProjectSchema = z.object({
  rebuildSchema: z.any(),
  outputPath: z.string(),
  options: z.object({
    runFlutterCreate: z.boolean().default(true),
    formatCode: z.boolean().default(true),
    generateTests: z.boolean().default(false),
  }).optional(),
});

Run tests after creation to verify no syntax errors.
```

**Verification Checkpoint:**
```bash
# Orchestrator runs after subagent completes:
npm run build 2>&1 | grep -E "(error|Error)" | head -10
ls -la src/modules/github/
```

**Expected Output from Subagent:**
```
FILES CREATED:
- src/modules/github/index.ts (module definition)
- src/modules/github/config.ts (interfaces + schemas)
- src/modules/github/hooks.ts (lifecycle hooks)

KEY EXPORTS:
- GithubModule (module definition)
- All interfaces (CloneResult, AnalysisResult, etc.)
- All Zod schemas (GithubCloneRepositorySchema, etc.)

VERIFICATION: npm run build succeeds
```

---

### Subagent 1B: Create Tools File & Register Module

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide (includes handoff from 1A):**
```
MISSION: Create GitHub tools file and register module

PREVIOUS AGENT COMPLETED:
- src/modules/github/index.ts - Module definition with GithubModule export
- src/modules/github/config.ts - All interfaces and Zod schemas
- src/modules/github/hooks.ts - Lifecycle hooks

YOUR TASKS:

1. Create src/modules/github/tools.ts with:
   - Import schemas from ./config.js
   - GITHUB_TOOLS array with 6 tool definitions
   - handleGithubTool() function (empty handlers for now, just return placeholders)

Tool definitions to create:

{
  name: "github_clone_repository",
  description: "Clone a GitHub repository to temporary directory for analysis",
  inputSchema: { type: "object", properties: { url, branch, depth }, required: ["url"] }
}

{
  name: "github_analyze_flutter_project",
  description: "Deep analysis of Flutter project structure, architecture, and components",
  inputSchema: { type: "object", properties: { localPath, analyzeDepth }, required: ["localPath"] }
}

{
  name: "github_extract_models",
  description: "Extract model/entity class definitions from Dart files",
  inputSchema: { type: "object", properties: { localPath, modelPaths }, required: ["localPath"] }
}

{
  name: "github_extract_screens",
  description: "Extract screen/page widget definitions from Dart files",
  inputSchema: { type: "object", properties: { localPath, screenPaths }, required: ["localPath"] }
}

{
  name: "github_create_rebuild_schema",
  description: "Transform analysis results into MCP project rebuild schema",
  inputSchema: { type: "object", properties: { analysisResult, options }, required: ["analysisResult"] }
}

{
  name: "github_rebuild_project",
  description: "Execute project rebuild using MCP generation pipeline",
  inputSchema: { type: "object", properties: { rebuildSchema, outputPath, options }, required: ["rebuildSchema", "outputPath"] }
}

2. Update src/modules/github/index.ts to export GITHUB_TOOLS

3. Update src/index.ts to:
   - Import GithubModule and GITHUB_TOOLS from ./modules/github/index.js
   - Register: moduleSystem.register(GithubModule)
   - Register templates (if any)

4. Update src/tools/index.ts to:
   - Import handleGithubTool from modules
   - Add all 6 github_* tools to getTools() array
   - Add case branches in handleToolCall() switch

Run tests after completion.
```

**Verification Checkpoint:**
```bash
# Orchestrator runs:
npm test 2>&1 | tail -5
grep -c "github_" src/tools/index.ts  # Should show 6+ occurrences
```

**Expected Output from Subagent:**
```
FILES CREATED:
- src/modules/github/tools.ts (6 tool definitions + handler)

FILES MODIFIED:
- src/modules/github/index.ts (added GITHUB_TOOLS export)
- src/index.ts (registered GithubModule)
- src/tools/index.ts (added 6 tools + case branches)

VERIFICATION: All tests pass, 6 new tools registered
```

---

## PHASE 1 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test                                    # All tests pass
npm run build                               # No errors
grep "github" src/index.ts                  # Module registered
grep -c "github_" src/tools/index.ts        # 6+ tool references
```

**Phase 1 Complete When:**
- [ ] Module structure created (3 files in src/modules/github/)
- [ ] Tools file with 6 tool definitions
- [ ] Module registered in src/index.ts
- [ ] Tools registered in src/tools/index.ts
- [ ] All tests pass

---

## PHASE 2: Git Clone & Pubspec Parsing

### Subagent 2A: Implement Git Clone Tool

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement github_clone_repository tool handler

COMPLETED IN PHASE 1:
- src/modules/github/ module created
- Tools registered in src/tools/index.ts
- GithubCloneRepositorySchema in config.ts

YOUR TASKS:

1. Add dependencies to package.json:
   - "simple-git": "^3.22.0"
   - "tmp-promise": "^3.0.3"

2. Create src/modules/github/utils/git-utils.ts:

import simpleGit, { SimpleGit } from 'simple-git';
import { dir as tmpDir } from 'tmp-promise';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface CloneOptions {
  url: string;
  branch?: string;
  depth?: number;
}

export interface CloneResult {
  success: boolean;
  localPath: string;
  repoName: string;
  branch: string;
  commit: string;
  size: number;
  error?: string;
}

export async function cloneRepository(options: CloneOptions): Promise<CloneResult> {
  const { url, branch = 'main', depth = 1 } = options;

  // Extract repo name from URL
  const repoName = extractRepoName(url);

  // Create temp directory
  const tmpResult = await tmpDir({ prefix: 'mcp-github-', unsafeCleanup: true });
  const localPath = path.join(tmpResult.path, repoName);

  try {
    const git: SimpleGit = simpleGit();

    // Clone with options
    await git.clone(url, localPath, [
      '--branch', branch,
      '--depth', String(depth),
      '--single-branch',
    ]);

    // Get commit hash
    const repoGit = simpleGit(localPath);
    const log = await repoGit.log({ maxCount: 1 });
    const commit = log.latest?.hash || 'unknown';

    // Calculate size
    const size = await getDirectorySize(localPath);

    return {
      success: true,
      localPath,
      repoName,
      branch,
      commit,
      size,
    };
  } catch (error) {
    return {
      success: false,
      localPath: '',
      repoName,
      branch,
      commit: '',
      size: 0,
      error: error instanceof Error ? error.message : 'Clone failed',
    };
  }
}

function extractRepoName(url: string): string {
  // Handle: https://github.com/user/repo.git or https://github.com/user/repo
  const match = url.match(/\/([^\/]+?)(\.git)?$/);
  return match ? match[1] : 'repo';
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  const files = await fs.readdir(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      if (file.name !== '.git') {
        size += await getDirectorySize(filePath);
      }
    } else {
      const stat = await fs.stat(filePath);
      size += stat.size;
    }
  }

  return size;
}

export async function cleanupClone(localPath: string): Promise<void> {
  try {
    await fs.remove(localPath);
  } catch (error) {
    console.warn(`Failed to cleanup: ${localPath}`);
  }
}

3. Update src/modules/github/tools.ts:
   - Import { cloneRepository } from './utils/git-utils.js'
   - Implement handleCloneRepository() handler
   - Wire up in handleGithubTool() switch

Handler implementation:
async function handleCloneRepository(input: z.infer<typeof GithubCloneRepositorySchema>): Promise<any> {
  const result = await cloneRepository({
    url: input.url,
    branch: input.branch,
    depth: input.depth,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    localPath: result.localPath,
    repoName: result.repoName,
    branch: result.branch,
    commit: result.commit,
    sizeBytes: result.size,
    sizeHuman: formatBytes(result.size),
    message: `Successfully cloned ${result.repoName} to ${result.localPath}`,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

Run: npm install && npm test
```

**Verification Checkpoint:**
```bash
npm install
npm run build
npm test
```

**Expected Output:**
```
FILES CREATED:
- src/modules/github/utils/git-utils.ts

FILES MODIFIED:
- package.json (added simple-git, tmp-promise)
- src/modules/github/tools.ts (implemented handleCloneRepository)

VERIFICATION: npm test passes, clone handler implemented
```

---

### Subagent 2B: Implement Pubspec Parser

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement pubspec.yaml parser for Flutter project analysis

COMPLETED IN PHASE 2A:
- src/modules/github/utils/git-utils.ts - cloneRepository() working
- github_clone_repository tool handler implemented

YOUR TASKS:

1. Create src/modules/github/parsers/pubspec-parser.ts:

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'yaml';

export interface PubspecInfo {
  name: string;
  description: string;
  version: string;

  // SDK constraints
  flutter: {
    version: string;
    channel: 'stable' | 'beta' | 'dev' | 'unknown';
  };
  dart: {
    minVersion: string;
    maxVersion?: string;
  };

  // Dependency analysis
  dependencies: {
    // State management
    stateManagement: 'riverpod' | 'bloc' | 'provider' | 'getx' | 'mobx' | 'none';
    statePackages: string[];

    // Database
    database: 'drift' | 'sqflite' | 'hive' | 'isar' | 'none';
    databasePackages: string[];

    // Networking
    networking: 'dio' | 'http' | 'chopper' | 'retrofit' | 'none';
    networkPackages: string[];

    // Navigation
    navigation: 'go_router' | 'auto_route' | 'navigator' | 'none';
    navigationPackages: string[];

    // Code generation
    usesFreezed: boolean;
    usesJsonSerializable: boolean;
    usesBuildRunner: boolean;

    // All dependencies
    all: Record<string, string>;
    dev: Record<string, string>;
  };

  // Assets
  assets: string[];
  fonts: string[];
}

const STATE_MANAGEMENT_PACKAGES = {
  riverpod: ['flutter_riverpod', 'riverpod', 'hooks_riverpod'],
  bloc: ['flutter_bloc', 'bloc', 'hydrated_bloc'],
  provider: ['provider'],
  getx: ['get', 'getx'],
  mobx: ['flutter_mobx', 'mobx'],
};

const DATABASE_PACKAGES = {
  drift: ['drift', 'drift_flutter', 'moor', 'moor_flutter'],
  sqflite: ['sqflite'],
  hive: ['hive', 'hive_flutter'],
  isar: ['isar', 'isar_flutter_libs'],
};

const NETWORK_PACKAGES = {
  dio: ['dio'],
  http: ['http'],
  chopper: ['chopper'],
  retrofit: ['retrofit'],
};

const NAVIGATION_PACKAGES = {
  go_router: ['go_router'],
  auto_route: ['auto_route'],
};

export async function parsePubspec(projectPath: string): Promise<PubspecInfo> {
  const pubspecPath = path.join(projectPath, 'pubspec.yaml');

  if (!await fs.pathExists(pubspecPath)) {
    throw new Error(`pubspec.yaml not found at ${pubspecPath}`);
  }

  const content = await fs.readFile(pubspecPath, 'utf-8');
  const pubspec = yaml.parse(content);

  const dependencies = pubspec.dependencies || {};
  const devDependencies = pubspec.dev_dependencies || {};
  const allDeps = { ...dependencies, ...devDependencies };

  return {
    name: pubspec.name || 'unknown',
    description: pubspec.description || '',
    version: pubspec.version || '1.0.0',

    flutter: parseFlutterVersion(pubspec),
    dart: parseDartVersion(pubspec),

    dependencies: {
      stateManagement: detectPackageCategory(allDeps, STATE_MANAGEMENT_PACKAGES),
      statePackages: findMatchingPackages(allDeps, STATE_MANAGEMENT_PACKAGES),

      database: detectPackageCategory(allDeps, DATABASE_PACKAGES),
      databasePackages: findMatchingPackages(allDeps, DATABASE_PACKAGES),

      networking: detectPackageCategory(allDeps, NETWORK_PACKAGES),
      networkPackages: findMatchingPackages(allDeps, NETWORK_PACKAGES),

      navigation: detectPackageCategory(allDeps, NAVIGATION_PACKAGES),
      navigationPackages: findMatchingPackages(allDeps, NAVIGATION_PACKAGES),

      usesFreezed: 'freezed' in allDeps || 'freezed_annotation' in allDeps,
      usesJsonSerializable: 'json_serializable' in allDeps || 'json_annotation' in allDeps,
      usesBuildRunner: 'build_runner' in allDeps,

      all: dependencies,
      dev: devDependencies,
    },

    assets: parseAssets(pubspec),
    fonts: parseFonts(pubspec),
  };
}

function parseFlutterVersion(pubspec: any): PubspecInfo['flutter'] {
  const env = pubspec.environment || {};
  const flutter = env.flutter || '>=3.0.0';

  // Extract minimum version
  const match = flutter.match(/>=?\s*([\d.]+)/);
  const version = match ? match[1] : '3.0.0';

  return {
    version,
    channel: 'stable',
  };
}

function parseDartVersion(pubspec: any): PubspecInfo['dart'] {
  const env = pubspec.environment || {};
  const sdk = env.sdk || '>=3.0.0 <4.0.0';

  const minMatch = sdk.match(/>=?\s*([\d.]+)/);
  const maxMatch = sdk.match(/<\s*([\d.]+)/);

  return {
    minVersion: minMatch ? minMatch[1] : '3.0.0',
    maxVersion: maxMatch ? maxMatch[1] : undefined,
  };
}

function detectPackageCategory<T extends string>(
  deps: Record<string, string>,
  categories: Record<T, string[]>
): T | 'none' {
  for (const [category, packages] of Object.entries(categories) as [T, string[]][]) {
    if (packages.some(pkg => pkg in deps)) {
      return category;
    }
  }
  return 'none' as T | 'none';
}

function findMatchingPackages(
  deps: Record<string, string>,
  categories: Record<string, string[]>
): string[] {
  const allPackages = Object.values(categories).flat();
  return allPackages.filter(pkg => pkg in deps);
}

function parseAssets(pubspec: any): string[] {
  const flutter = pubspec.flutter || {};
  return flutter.assets || [];
}

function parseFonts(pubspec: any): string[] {
  const flutter = pubspec.flutter || {};
  const fonts = flutter.fonts || [];
  return fonts.map((f: any) => f.family).filter(Boolean);
}

2. Create src/modules/github/parsers/index.ts:
   - Export all parsers

3. Update src/modules/github/tools.ts:
   - Import parsePubspec from parsers
   - Use in github_analyze_flutter_project handler (partial implementation)

Run tests after completion.
```

**Verification Checkpoint:**
```bash
npm run build
npm test
```

**Expected Output:**
```
FILES CREATED:
- src/modules/github/parsers/pubspec-parser.ts
- src/modules/github/parsers/index.ts

FILES MODIFIED:
- src/modules/github/tools.ts (import pubspec parser)

KEY EXPORTS:
- parsePubspec(projectPath) -> PubspecInfo
- PubspecInfo interface

VERIFICATION: Build succeeds, parser ready for use
```

---

## PHASE 2 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test
npm run build
ls src/modules/github/utils/
ls src/modules/github/parsers/
```

**Phase 2 Complete When:**
- [ ] git-utils.ts with cloneRepository() function
- [ ] pubspec-parser.ts with parsePubspec() function
- [ ] github_clone_repository handler working
- [ ] All tests pass

---

## PHASE 3: Deep Analysis (Parallel Subagents)

### Subagent 3A: Architecture Detector

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement architecture detection for Flutter projects

COMPLETED IN PHASES 1-2:
- Module structure at src/modules/github/
- git-utils.ts with cloneRepository()
- pubspec-parser.ts with parsePubspec()

YOUR TASK: Create src/modules/github/analyzers/architecture-detector.ts

import * as fs from 'fs-extra';
import * as path from 'path';
import { FolderNode } from '../config.js';

export type Architecture = 'clean' | 'feature-first' | 'layer-first' | 'custom';

export interface ArchitectureResult {
  detected: Architecture;
  confidence: number;  // 0-100
  structure: FolderNode;
  reasoning: string[];
}

// Detection patterns
const CLEAN_ARCH_FOLDERS = ['domain', 'data', 'presentation'];
const CLEAN_ARCH_SUBFOLDERS = {
  domain: ['entities', 'repositories', 'usecases'],
  data: ['datasources', 'models', 'repositories'],
  presentation: ['pages', 'widgets', 'bloc', 'screens'],
};

const FEATURE_FIRST_PATTERN = /^(features|modules)$/;
const FEATURE_SUBFOLDERS = ['data', 'domain', 'presentation', 'screens', 'widgets'];

const LAYER_FIRST_FOLDERS = ['models', 'views', 'controllers', 'services'];
const LAYER_FIRST_ALT = ['screens', 'pages', 'providers', 'repositories', 'widgets'];

export async function detectArchitecture(libPath: string): Promise<ArchitectureResult> {
  const structure = await buildFolderTree(libPath);
  const topLevelFolders = await getTopLevelFolders(libPath);
  const reasoning: string[] = [];

  // Check for clean architecture
  const cleanScore = detectCleanArchitecture(topLevelFolders, libPath, reasoning);

  // Check for feature-first
  const featureScore = await detectFeatureFirst(topLevelFolders, libPath, reasoning);

  // Check for layer-first
  const layerScore = detectLayerFirst(topLevelFolders, reasoning);

  // Determine winner
  const scores = [
    { arch: 'clean' as Architecture, score: cleanScore },
    { arch: 'feature-first' as Architecture, score: featureScore },
    { arch: 'layer-first' as Architecture, score: layerScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0];

  // If no clear winner, mark as custom
  if (winner.score < 40) {
    return {
      detected: 'custom',
      confidence: 100 - winner.score,
      structure,
      reasoning: [...reasoning, 'No clear architecture pattern detected'],
    };
  }

  return {
    detected: winner.arch,
    confidence: winner.score,
    structure,
    reasoning,
  };
}

function detectCleanArchitecture(
  folders: string[],
  libPath: string,
  reasoning: string[]
): number {
  let score = 0;
  const found = CLEAN_ARCH_FOLDERS.filter(f => folders.includes(f));

  if (found.length >= 2) {
    score += 40;
    reasoning.push(`Found clean arch folders: ${found.join(', ')}`);
  }

  // Check for subfolders
  // Add more scoring logic...

  return Math.min(score, 100);
}

async function detectFeatureFirst(
  folders: string[],
  libPath: string,
  reasoning: string[]
): Promise<number> {
  let score = 0;

  const featureFolder = folders.find(f => FEATURE_FIRST_PATTERN.test(f));
  if (featureFolder) {
    score += 30;
    reasoning.push(`Found features folder: ${featureFolder}`);

    // Check feature subfolders
    const featuresPath = path.join(libPath, featureFolder);
    const features = await getTopLevelFolders(featuresPath);

    if (features.length >= 2) {
      score += 20;
      reasoning.push(`Found ${features.length} feature modules`);

      // Check first feature for structure
      const firstFeaturePath = path.join(featuresPath, features[0]);
      const featureContents = await getTopLevelFolders(firstFeaturePath);
      const hasStructure = FEATURE_SUBFOLDERS.some(f => featureContents.includes(f));

      if (hasStructure) {
        score += 30;
        reasoning.push('Feature modules have internal structure');
      }
    }
  }

  return Math.min(score, 100);
}

function detectLayerFirst(folders: string[], reasoning: string[]): number {
  let score = 0;

  const found = [...LAYER_FIRST_FOLDERS, ...LAYER_FIRST_ALT]
    .filter(f => folders.includes(f));

  if (found.length >= 3) {
    score += 60;
    reasoning.push(`Found layer folders: ${found.join(', ')}`);
  } else if (found.length >= 2) {
    score += 40;
    reasoning.push(`Found some layer folders: ${found.join(', ')}`);
  }

  return Math.min(score, 100);
}

async function getTopLevelFolders(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(n => !n.startsWith('.'));
  } catch {
    return [];
  }
}

async function buildFolderTree(dirPath: string, depth = 3): Promise<FolderNode> {
  const name = path.basename(dirPath);
  const node: FolderNode = {
    name,
    path: dirPath,
    type: 'directory',
    children: [],
  };

  if (depth <= 0) return node;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const child = await buildFolderTree(entryPath, depth - 1);
        node.children!.push(child);
      } else {
        node.children!.push({
          name: entry.name,
          path: entryPath,
          type: 'file',
          fileType: getFileType(entry.name),
          category: categorizeFile(entry.name, dirPath),
        });
      }
    }
  } catch {
    // Directory not readable
  }

  return node;
}

function getFileType(filename: string): FolderNode['fileType'] {
  if (filename.endsWith('.dart')) return 'dart';
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'yaml';
  if (filename.endsWith('.json')) return 'json';
  return 'other';
}

function categorizeFile(filename: string, dirPath: string): FolderNode['category'] {
  const dir = path.basename(dirPath).toLowerCase();

  if (dir.includes('model') || filename.includes('_model')) return 'model';
  if (dir.includes('screen') || dir.includes('page')) return 'screen';
  if (dir.includes('widget')) return 'widget';
  if (dir.includes('provider') || dir.includes('bloc')) return 'provider';
  if (dir.includes('service') || dir.includes('repository')) return 'service';
  if (dir.includes('theme')) return 'theme';
  if (dir.includes('route')) return 'route';

  return 'unknown';
}

Also create src/modules/github/analyzers/index.ts to export.

Run tests after completion.
```

**Expected Output:**
```
FILES CREATED:
- src/modules/github/analyzers/architecture-detector.ts
- src/modules/github/analyzers/index.ts

KEY EXPORTS:
- detectArchitecture(libPath) -> ArchitectureResult
```

---

### Subagent 3B: Model Extractor

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement Dart model/entity class extractor

COMPLETED: Architecture detector at src/modules/github/analyzers/architecture-detector.ts

YOUR TASK: Create src/modules/github/analyzers/model-extractor.ts

Extract model classes from Dart files using regex patterns.

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ModelDefinition, FieldDefinition } from '../config.js';

// Regex patterns for Dart parsing
const CLASS_PATTERN = /^(?:@\w+(?:\([^)]*\))?[\s\n]*)*(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+with\s+([\w,\s]+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/gm;

const FIELD_PATTERN = /^\s*(?:@\w+(?:\([^)]*\))?[\s\n]*)*(?:final\s+|const\s+|late\s+|static\s+)*([\w<>,?\s]+)\s+(\w+)(?:\s*=\s*([^;]+))?;/gm;

const ANNOTATION_PATTERN = /@(\w+)(?:\(([^)]*)\))?/g;

export interface ExtractOptions {
  includeAbstract?: boolean;
  modelPatterns?: string[];  // Glob patterns
}

export async function extractModels(
  projectPath: string,
  options: ExtractOptions = {}
): Promise<ModelDefinition[]> {
  const { includeAbstract = false, modelPatterns } = options;

  // Find Dart files
  const patterns = modelPatterns || [
    '**/models/**/*.dart',
    '**/entities/**/*.dart',
    '**/domain/**/*.dart',
    '**/*_model.dart',
    '**/*_entity.dart',
  ];

  const dartFiles: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: ['**/.*', '**/build/**', '**/*.g.dart', '**/*.freezed.dart'],
    });
    dartFiles.push(...matches);
  }

  // Deduplicate
  const uniqueFiles = [...new Set(dartFiles)];

  const models: ModelDefinition[] = [];

  for (const file of uniqueFiles) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const fileModels = parseModelsFromContent(content, file, includeAbstract);
    models.push(...fileModels);
  }

  return models;
}

function parseModelsFromContent(
  content: string,
  filePath: string,
  includeAbstract: boolean
): ModelDefinition[] {
  const models: ModelDefinition[] = [];

  // Reset regex
  CLASS_PATTERN.lastIndex = 0;

  let match;
  while ((match = CLASS_PATTERN.exec(content)) !== null) {
    const [fullMatch, className, extendsClass, mixins, implements_] = match;

    // Skip abstract unless requested
    if (!includeAbstract && fullMatch.includes('abstract')) continue;

    // Skip widgets and other non-model classes
    if (isWidgetClass(className, extendsClass)) continue;

    // Extract class body
    const classStart = match.index;
    const classBody = extractClassBody(content, classStart);

    // Parse fields
    const fields = parseFields(classBody);

    // Parse annotations
    const annotations = parseAnnotations(fullMatch);

    // Detect relationships
    const relationships = detectRelationships(fields);

    models.push({
      name: className,
      filePath,
      fields,
      annotations,
      relationships,
      isImmutable: annotations.includes('freezed') || annotations.includes('immutable'),
      hasJson: annotations.includes('JsonSerializable') ||
               classBody.includes('fromJson') ||
               classBody.includes('toJson'),
    });
  }

  return models;
}

function isWidgetClass(className: string, extendsClass?: string): boolean {
  if (!extendsClass) return false;
  const widgetBases = ['StatefulWidget', 'StatelessWidget', 'HookWidget', 'ConsumerWidget', 'Widget'];
  return widgetBases.some(base => extendsClass.includes(base));
}

function extractClassBody(content: string, startIndex: number): string {
  let braceCount = 0;
  let started = false;
  let endIndex = startIndex;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      started = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  return content.slice(startIndex, endIndex);
}

function parseFields(classBody: string): FieldDefinition[] {
  const fields: FieldDefinition[] = [];
  FIELD_PATTERN.lastIndex = 0;

  let match;
  while ((match = FIELD_PATTERN.exec(classBody)) !== null) {
    const [fullMatch, type, name, defaultValue] = match;

    // Skip static fields
    if (fullMatch.includes('static')) continue;

    const cleanType = type.trim();
    const nullable = cleanType.endsWith('?');

    fields.push({
      name,
      type: cleanType.replace('?', ''),
      nullable,
      defaultValue: defaultValue?.trim(),
      annotations: parseAnnotations(fullMatch),
    });
  }

  return fields;
}

function parseAnnotations(text: string): string[] {
  const annotations: string[] = [];
  ANNOTATION_PATTERN.lastIndex = 0;

  let match;
  while ((match = ANNOTATION_PATTERN.exec(text)) !== null) {
    annotations.push(match[1]);
  }

  return annotations;
}

function detectRelationships(fields: FieldDefinition[]): ModelDefinition['relationships'] {
  const relationships: ModelDefinition['relationships'] = [];

  for (const field of fields) {
    const type = field.type;

    // Detect List<OtherModel> -> hasMany
    const listMatch = type.match(/List<(\w+)>/);
    if (listMatch && isModelType(listMatch[1])) {
      relationships.push({
        type: 'hasMany',
        target: listMatch[1],
        fieldName: field.name,
      });
      continue;
    }

    // Detect OtherModel -> hasOne
    if (isModelType(type)) {
      relationships.push({
        type: 'hasOne',
        target: type,
        fieldName: field.name,
      });
    }
  }

  return relationships;
}

function isModelType(typeName: string): boolean {
  // Exclude built-in types
  const builtIns = ['String', 'int', 'double', 'bool', 'DateTime', 'dynamic', 'Object', 'Map', 'Set'];
  return !builtIns.includes(typeName) && /^[A-Z]/.test(typeName);
}

Update src/modules/github/analyzers/index.ts to export extractModels.

Run tests.
```

**Expected Output:**
```
FILES CREATED:
- src/modules/github/analyzers/model-extractor.ts

FILES MODIFIED:
- src/modules/github/analyzers/index.ts (added export)

KEY EXPORTS:
- extractModels(projectPath, options) -> ModelDefinition[]
```

---

### Subagent 3C: Screen Extractor

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement screen/page widget extractor

COMPLETED: Model extractor at src/modules/github/analyzers/model-extractor.ts

YOUR TASK: Create src/modules/github/analyzers/screen-extractor.ts

Similar to model extractor but for StatefulWidget/StatelessWidget screens.

Key detection patterns:
- Class extends StatefulWidget/StatelessWidget
- File in screens/, pages/, views/ folders
- Contains Scaffold widget
- Has route annotation or is referenced in routes

Include scaffold analysis:
- hasAppBar: look for AppBar in build method
- hasBottomNav: look for BottomNavigationBar
- hasDrawer: look for Drawer
- hasFab: look for FloatingActionButton

Detect provider dependencies:
- ref.watch, ref.read (Riverpod)
- BlocProvider.of, context.read (BLoC)
- Provider.of, context.watch (Provider)

Output: ScreenDefinition[] array

Run tests after completion.
```

---

### Subagent 3D: Widget Extractor

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement reusable widget extractor

COMPLETED: Screen extractor at src/modules/github/analyzers/screen-extractor.ts

YOUR TASK: Create src/modules/github/analyzers/widget-extractor.ts

Extract custom widgets that are NOT screens:
- Located in widgets/ folders
- Reusable components (buttons, cards, inputs, etc.)
- Have props (constructor parameters)

Differentiate from screens by:
- No Scaffold
- Usually in widgets/ not screens/ folder
- Smaller, focused components

Output: WidgetDefinition[] array

Also create theme-extractor.ts:
- Parse existing ThemeData
- Extract colors, typography, spacing
- Detect Material/Cupertino usage

Run tests after completion.
```

---

## PHASE 3 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test
ls src/modules/github/analyzers/
# Should show: index.ts, architecture-detector.ts, model-extractor.ts,
#              screen-extractor.ts, widget-extractor.ts, theme-extractor.ts
```

**Phase 3 Complete When:**
- [ ] architecture-detector.ts working
- [ ] model-extractor.ts working
- [ ] screen-extractor.ts working
- [ ] widget-extractor.ts working
- [ ] theme-extractor.ts working
- [ ] All tests pass

---

## PHASE 4: Transform & Schema

### Subagent 4A: Implement Main Analysis Tool

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Wire up github_analyze_flutter_project tool handler

COMPLETED IN PHASE 3:
- All analyzers in src/modules/github/analyzers/
- detectArchitecture()
- extractModels()
- extractScreens()
- extractWidgets()
- extractTheme()

YOUR TASK: Implement the full analysis handler in tools.ts

async function handleAnalyzeFlutterProject(input): Promise<AnalysisResult> {
  const { localPath, analyzeDepth } = input;
  const libPath = path.join(localPath, 'lib');

  // 1. Parse pubspec
  const pubspec = await parsePubspec(localPath);

  // 2. Detect architecture
  const architecture = await detectArchitecture(libPath);

  // 3. Extract components (based on depth)
  const models = await extractModels(localPath);
  const screens = analyzeDepth !== 'shallow' ? await extractScreens(localPath) : [];
  const widgets = analyzeDepth === 'deep' ? await extractWidgets(localPath) : [];

  // 4. Compute stats
  const stats = await computeProjectStats(localPath);

  return {
    name: pubspec.name,
    description: pubspec.description,
    flutterVersion: pubspec.flutter.version,
    dartVersion: pubspec.dart.minVersion,
    architecture: {
      detected: architecture.detected,
      confidence: architecture.confidence,
      structure: architecture.structure,
    },
    dependencies: {
      stateManagement: pubspec.dependencies.stateManagement,
      database: pubspec.dependencies.database,
      networking: pubspec.dependencies.networking,
      navigation: pubspec.dependencies.navigation,
    },
    models,
    screens,
    widgets,
    stats,
  };
}

Run tests after completion.
```

---

### Subagent 4B: Implement Schema Builder

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement github_create_rebuild_schema tool

COMPLETED: github_analyze_flutter_project handler working

YOUR TASK: Create src/modules/github/builders/schema-builder.ts

Transform AnalysisResult into RebuildSchema:

1. Map original architecture to target
2. Plan model migrations (keep vs regenerate with Drift)
3. Plan screen migrations (apply EDC glassmorphism)
4. Determine which modules to install (drift, design, state, pwa)
5. Generate file list for each category

Also implement the handler in tools.ts.

Run tests after completion.
```

---

## PHASE 4 COMPLETION CHECKPOINT

**Phase 4 Complete When:**
- [ ] github_analyze_flutter_project handler implemented
- [ ] github_create_rebuild_schema handler implemented
- [ ] Schema builder creates valid RebuildSchema
- [ ] All tests pass

---

## PHASE 5: Rebuild Execution

### Subagent 5A: Project Builder

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Implement github_rebuild_project tool

COMPLETED: Schema builder creates RebuildSchema

YOUR TASK: Create src/modules/github/builders/project-builder.ts

Execute the rebuild:

1. Create MCP project from schema.projectDefinition
2. Install required modules (design, drift, state, etc.)
3. Generate files using existing design tools
4. Copy preserved files from original
5. Run dart format if requested
6. Return summary

Use existing:
- projectEngine.create()
- moduleSystem.install()
- design_generate_full_system (for theme/components)

Run tests after completion.
```

---

### Subagent 5B: Integration & Polish

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Final integration and combined tool

COMPLETED: All individual tools working

YOUR TASKS:

1. Add github_import_and_rebuild combined tool:
   - Single tool that does clone -> analyze -> schema -> rebuild
   - For convenience

2. Update handleGithubTool() to wire all handlers

3. Add cleanup function to remove temp directories

4. Run full test suite

5. Test with a real GitHub repo (optional)

Run tests after completion.
```

---

## PHASE 5 COMPLETION CHECKPOINT

**Phase 5 Complete When:**
- [ ] github_rebuild_project handler implemented
- [ ] github_import_and_rebuild combined tool added
- [ ] Temp cleanup working
- [ ] All tests pass

---

## PHASE 6: Testing & Documentation

### Subagent 6A: Tests & Final Verification

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Create tests for GitHub module

YOUR TASKS:

1. Create tests/github.test.ts with tests for:
   - Tool registration (all 7 tools registered)
   - pubspec-parser (mock pubspec content)
   - architecture-detector (mock folder structures)
   - model-extractor (mock Dart file content)
   - schema-builder (mock analysis result)

2. Run full test suite

3. Fix any failing tests

4. Verify npm run build succeeds

Run tests after completion.
```

---

## PHASE 6 COMPLETION CHECKPOINT

**Phase 6 Complete When:**
- [ ] tests/github.test.ts created
- [ ] All new tests pass
- [ ] All 605+ existing tests still pass
- [ ] npm run build succeeds

---

## FINAL VERIFICATION CHECKLIST

```bash
# Run all verifications
npm test                                    # All tests pass
npm run build                               # No errors
grep -c "github_" src/tools/index.ts        # 7+ tool references
ls src/modules/github/analyzers/            # 5+ analyzer files
ls src/modules/github/parsers/              # 2+ parser files
ls src/modules/github/builders/             # 2+ builder files
ls src/modules/github/utils/                # 1+ util files
```

**Feature Complete When:**
- [ ] All 6 phases completed
- [ ] 7 tools registered and working
- [ ] All tests pass
- [ ] Can clone real GitHub Flutter repo
- [ ] Can analyze and rebuild project

---

## ORCHESTRATION COMMANDS SUMMARY

```
PHASE 1A: Task(subagent_type="afk-tool-developer") - Module structure
PHASE 1B: Task(subagent_type="afk-tool-developer") - Tools & registration
--- VERIFY PHASE 1 ---

PHASE 2A: Task(subagent_type="afk-tool-developer") - Git clone
PHASE 2B: Task(subagent_type="afk-tool-developer") - Pubspec parser
--- VERIFY PHASE 2 ---

PHASE 3A: Task(subagent_type="afk-tool-developer") - Architecture detector
PHASE 3B: Task(subagent_type="afk-tool-developer") - Model extractor
PHASE 3C: Task(subagent_type="afk-tool-developer") - Screen extractor
PHASE 3D: Task(subagent_type="afk-tool-developer") - Widget extractor
--- VERIFY PHASE 3 ---

PHASE 4A: Task(subagent_type="afk-tool-developer") - Analysis handler
PHASE 4B: Task(subagent_type="afk-tool-developer") - Schema builder
--- VERIFY PHASE 4 ---

PHASE 5A: Task(subagent_type="afk-tool-developer") - Project builder
PHASE 5B: Task(subagent_type="afk-tool-developer") - Integration
--- VERIFY PHASE 5 ---

PHASE 6A: Task(subagent_type="afk-tool-developer") - Tests
--- VERIFY PHASE 6 ---

COMPLETE
```

---

*Document Version: 2.0 - Orchestration Playbook*
*Created: 2026-01-14*
*For: offline-flutter-pwa-builder MCP Server*
