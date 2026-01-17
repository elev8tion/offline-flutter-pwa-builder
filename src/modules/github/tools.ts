import {
  GithubCloneRepositorySchema,
  GithubAnalyzeProjectSchema,
  GithubExtractModelsSchema,
  GithubExtractScreensSchema,
  GithubCreateRebuildSchemaSchema,
  GithubRebuildProjectSchema,
  GithubImportAndRebuildSchema,
} from './config.js';
import { cloneRepository, formatBytes, cleanupClone } from './utils/git-utils.js';
import { parsePubspec } from './parsers/index.js';
import { detectArchitecture, extractModels, extractScreens, extractWidgets, extractTheme } from './analyzers/index.js';
import { createRebuildSchema, rebuildProject } from './builders/index.js';
import * as path from 'path';
import fs from 'fs-extra';
import { z } from 'zod';

export const GITHUB_TOOLS = [
  {
    name: "github_clone_repository",
    description: "Clone a GitHub repository to temporary directory for analysis",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "GitHub repository URL" },
        branch: { type: "string", description: "Branch to clone (default: main)" },
        depth: { type: "number", description: "Clone depth (default: 1 for shallow)" },
      },
      required: ["url"],
    },
  },
  {
    name: "github_analyze_flutter_project",
    description: "Deep analysis of Flutter project structure, architecture, and components",
    inputSchema: {
      type: "object" as const,
      properties: {
        localPath: { type: "string", description: "Path to cloned Flutter project" },
        analyzeDepth: { type: "string", enum: ["shallow", "medium", "deep"], description: "Analysis depth" },
      },
      required: ["localPath"],
    },
  },
  {
    name: "github_extract_models",
    description: "Extract model/entity class definitions from Dart files",
    inputSchema: {
      type: "object" as const,
      properties: {
        localPath: { type: "string", description: "Path to Flutter project" },
        modelPaths: { type: "array", items: { type: "string" }, description: "Specific paths to analyze" },
      },
      required: ["localPath"],
    },
  },
  {
    name: "github_extract_screens",
    description: "Extract screen/page widget definitions from Dart files",
    inputSchema: {
      type: "object" as const,
      properties: {
        localPath: { type: "string", description: "Path to Flutter project" },
        screenPaths: { type: "array", items: { type: "string" }, description: "Specific paths to analyze" },
      },
      required: ["localPath"],
    },
  },
  {
    name: "github_create_rebuild_schema",
    description: "Transform analysis results into MCP project rebuild schema",
    inputSchema: {
      type: "object" as const,
      properties: {
        analysisResult: { type: "object", description: "Result from github_analyze_flutter_project" },
        options: {
          type: "object",
          properties: {
            keepModels: { type: "boolean" },
            keepScreenStructure: { type: "boolean" },
            applyEdcDesign: { type: "boolean" },
            addOfflineSupport: { type: "boolean" },
            targetArchitecture: { type: "string", enum: ["clean", "feature-first", "layer-first", "keep"] },
            targetStateManagement: { type: "string", enum: ["riverpod", "bloc", "keep"] },
          },
        },
      },
      required: ["analysisResult"],
    },
  },
  {
    name: "github_rebuild_project",
    description: "Execute project rebuild using MCP generation pipeline",
    inputSchema: {
      type: "object" as const,
      properties: {
        rebuildSchema: { type: "object", description: "Schema from github_create_rebuild_schema" },
        outputPath: { type: "string", description: "Output directory for rebuilt project" },
        options: {
          type: "object",
          properties: {
            runFlutterCreate: { type: "boolean" },
            formatCode: { type: "boolean" },
            generateTests: { type: "boolean" },
          },
        },
      },
      required: ["rebuildSchema", "outputPath"],
    },
  },
  {
    name: "github_import_and_rebuild",
    description: "Combined tool: clone, analyze, and rebuild a GitHub Flutter project in one step",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "GitHub repository URL" },
        outputPath: { type: "string", description: "Output directory for rebuilt project" },
        branch: { type: "string", description: "Branch to clone (default: main)" },
        options: {
          type: "object",
          properties: {
            analyzeDepth: { type: "string", enum: ["shallow", "medium", "deep"] },
            keepModels: { type: "boolean" },
            keepScreenStructure: { type: "boolean" },
            applyEdcDesign: { type: "boolean" },
            addOfflineSupport: { type: "boolean" },
          },
        },
      },
      required: ["url", "outputPath"],
    },
  },
];

export async function handleGithubTool(
  name: string,
  args: Record<string, unknown>
): Promise<any> {
  switch (name) {
    case 'github_clone_repository': {
      const input = GithubCloneRepositorySchema.parse(args);
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
    case 'github_analyze_flutter_project': {
      const input = GithubAnalyzeProjectSchema.parse(args);
      return await handleAnalyzeFlutterProject(input);
    }
    case 'github_extract_models': {
      const input = GithubExtractModelsSchema.parse(args);
      const models = await extractModels(input.localPath);
      return { success: true, models, count: models.length };
    }
    case 'github_extract_screens': {
      const input = GithubExtractScreensSchema.parse(args);
      const screens = await extractScreens(input.localPath);
      return { success: true, screens, count: screens.length };
    }
    case 'github_create_rebuild_schema': {
      const input = GithubCreateRebuildSchemaSchema.parse(args);
      const schema = await createRebuildSchema(input.analysisResult, input.options);
      return {
        success: true,
        schema,
        summary: {
          modelsToMigrate: schema.migrations.models.length,
          screensToMigrate: schema.migrations.screens.length,
          modulesToInstall: schema.projectDefinition.modules.length,
          warnings: schema.warnings,
        },
      };
    }
    case 'github_rebuild_project': {
      const input = GithubRebuildProjectSchema.parse(args);
      const result = await rebuildProject(
        input.rebuildSchema,
        input.outputPath,
        input.options
      );

      return {
        success: result.success,
        outputPath: result.outputPath,
        projectId: result.projectId,
        summary: {
          filesGenerated: result.filesGenerated,
          filesCopied: result.filesCopied,
          modulesInstalled: result.modulesInstalled,
        },
        warnings: result.warnings,
        nextSteps: result.nextSteps,
        error: result.error,
      };
    }
    case 'github_import_and_rebuild': {
      const input = GithubImportAndRebuildSchema.parse(args);

      // Step 1: Clone repository
      const cloneResult = await cloneRepository({
        url: input.url,
        branch: input.branch,
        depth: 1,
      });

      if (!cloneResult.success) {
        return {
          success: false,
          error: 'Clone failed: ' + cloneResult.error,
        };
      }

      // Step 2: Analyze project
      const analysisResult = await handleAnalyzeFlutterProject({
        localPath: cloneResult.localPath,
        analyzeDepth: input.options?.analyzeDepth || 'deep',
      });

      if (!analysisResult.success) {
        await cleanupClone(cloneResult.localPath);
        return {
          success: false,
          error: 'Analysis failed',
        };
      }

      // Step 3: Create rebuild schema
      const schema = await createRebuildSchema(analysisResult, input.options);

      // Step 4: Rebuild project
      const rebuildResult = await rebuildProject(
        schema,
        input.outputPath,
        { runFlutterCreate: true, formatCode: true }
      );

      // Step 5: Cleanup temp clone
      await cleanupClone(cloneResult.localPath);

      return {
        success: true,
        cloneInfo: {
          repoName: cloneResult.repoName,
          branch: cloneResult.branch,
          commit: cloneResult.commit,
        },
        analysisInfo: {
          name: analysisResult.name,
          architecture: analysisResult.architecture.detected,
          modelsFound: analysisResult.models.length,
          screensFound: analysisResult.screens.length,
        },
        rebuildInfo: {
          outputPath: rebuildResult.outputPath,
          filesGenerated: rebuildResult.filesGenerated,
          modulesInstalled: rebuildResult.modulesInstalled,
        },
        warnings: schema.warnings,
        nextSteps: rebuildResult.nextSteps,
      };
    }
    default:
      throw new Error(`Unknown GitHub tool: ${name}`);
  }
}

async function handleAnalyzeFlutterProject(input: z.infer<typeof GithubAnalyzeProjectSchema>): Promise<any> {
  const { localPath, analyzeDepth = 'deep' } = input;
  const libPath = path.join(localPath, 'lib');

  // Verify paths exist
  if (!await fs.pathExists(localPath)) {
    throw new Error(`Project path not found: ${localPath}`);
  }

  if (!await fs.pathExists(libPath)) {
    throw new Error(`lib/ directory not found: ${libPath}`);
  }

  // 1. Parse pubspec
  const pubspec = await parsePubspec(localPath);

  // 2. Detect architecture
  const architecture = await detectArchitecture(libPath);

  // 3. Extract components (based on depth)
  const models = await extractModels(localPath);
  const screens = analyzeDepth !== 'shallow' ? await extractScreens(localPath) : [];
  const widgets = analyzeDepth === 'deep' ? await extractWidgets(localPath) : [];
  const theme = analyzeDepth === 'deep' ? await extractTheme(localPath) : undefined;

  // 4. Compute stats
  const stats = await computeProjectStats(localPath);

  return {
    success: true,
    name: pubspec.name,
    description: pubspec.description,
    flutterVersion: pubspec.flutter.version,
    dartVersion: pubspec.dart.minVersion,
    architecture: {
      detected: architecture.detected,
      confidence: architecture.confidence,
      structure: architecture.structure,
      reasoning: architecture.reasoning,
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
    theme,
    stats,
  };
}

async function computeProjectStats(projectPath: string): Promise<any> {
  const libPath = path.join(projectPath, 'lib');
  const testPath = path.join(projectPath, 'test');

  // Count Dart files
  const dartFiles = await countFilesWithExtension(libPath, '.dart');
  const testFiles = await fs.pathExists(testPath)
    ? await countFilesWithExtension(testPath, '.dart')
    : 0;

  // Count lines of code
  const linesOfCode = await countLinesOfCode(libPath);

  return {
    totalFiles: dartFiles + testFiles,
    dartFiles,
    testFiles,
    linesOfCode,
  };
}

async function countFilesWithExtension(dir: string, ext: string): Promise<number> {
  let count = 0;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        count += await countFilesWithExtension(fullPath, ext);
      } else if (entry.name.endsWith(ext)) {
        count++;
      }
    }
  } catch {
    // Directory not accessible
  }

  return count;
}

async function countLinesOfCode(dir: string): Promise<number> {
  let lines = 0;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        lines += await countLinesOfCode(fullPath);
      } else if (entry.name.endsWith('.dart')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        lines += content.split('\n').length;
      }
    }
  } catch {
    // Directory not accessible
  }

  return lines;
}
