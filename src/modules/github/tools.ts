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
import { parsePubspec, parsePubspecContent } from './parsers/index.js';
import { detectArchitecture, extractModels, extractScreens, extractWidgets, extractTheme, parseModelsFromContent, parseScreensFromContent } from './analyzers/index.js';
import { parseRepomixFile, getModelFiles, getScreenFiles, getStateFiles, getWidgetFiles, getThemeFiles, getUtilsFiles, getServiceFiles, getConfigFiles } from './parsers/repomix-parser.js';
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
  {
    name: "repomix_import_and_rebuild",
    description: "Import and rebuild a Flutter project from a repomix-style text file (flattened repository export)",
    inputSchema: {
      type: "object" as const,
      properties: {
        filePath: { type: "string", description: "Path to the repomix text file" },
        outputPath: { type: "string", description: "Output directory for rebuilt project" },
        options: {
          type: "object",
          properties: {
            keepModels: { type: "boolean", description: "Keep original model definitions" },
            keepScreenStructure: { type: "boolean", description: "Keep original screen structure" },
            keepScreenCode: { type: "boolean", description: "Copy original screen code instead of generating placeholders" },
            applyEdcDesign: { type: "boolean", description: "Apply EDC glassmorphic design system" },
            addOfflineSupport: { type: "boolean", description: "Add Drift offline database support" },
            targetArchitecture: { type: "string", enum: ["clean", "feature-first", "layer-first", "keep"], description: "Target architecture pattern" },
            targetStateManagement: { type: "string", enum: ["riverpod", "bloc", "keep"], description: "Target state management" },
          },
        },
      },
      required: ["filePath", "outputPath"],
    },
  },
];

export async function handleGithubTool(
  name: string,
  args: Record<string, unknown>,
  context?: any
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
    case 'repomix_import_and_rebuild': {
      const input = z.object({
        filePath: z.string(),
        outputPath: z.string(),
        options: z.object({
          keepModels: z.boolean().optional(),
          keepScreenStructure: z.boolean().optional(),
          keepScreenCode: z.boolean().optional(),
          applyEdcDesign: z.boolean().optional(),
          addOfflineSupport: z.boolean().optional(),
          targetArchitecture: z.enum(['clean', 'feature-first', 'layer-first', 'keep']).optional(),
          targetStateManagement: z.enum(['riverpod', 'bloc', 'keep']).optional(),
        }).optional(),
      }).parse(args);

      // Step 1: Read and parse repomix file
      if (!await fs.pathExists(input.filePath)) {
        return {
          success: false,
          error: `Repomix file not found: ${input.filePath}`,
        };
      }

      const repomixContent = await fs.readFile(input.filePath, 'utf-8');
      const parsed = parseRepomixFile(repomixContent);

      // Step 2: Parse pubspec if available
      let pubspec = null;
      if (parsed.pubspecContent) {
        try {
          pubspec = parsePubspecContent(parsed.pubspecContent);
        } catch (e) {
          // Pubspec parsing failed, continue without it
        }
      }

      // Step 3: Extract models from model files
      const modelFiles = getModelFiles(parsed);
      const models: any[] = [];
      for (const file of modelFiles) {
        const fileModels = parseModelsFromContent(file.content, file.path);
        models.push(...fileModels);
      }

      // Step 4: Extract screens from screen files
      const screenFiles = getScreenFiles(parsed);
      const screens: any[] = [];
      for (const file of screenFiles) {
        const fileScreens = parseScreensFromContent(file.content, file.path);
        screens.push(...fileScreens);
      }

      // Step 5: Extract state management files
      const stateFiles = getStateFiles(parsed);

      // Step 6: Extract widget files
      const widgetFiles = getWidgetFiles(parsed);

      // Step 6b: Extract theme, utils, services, config files
      const themeFiles = getThemeFiles(parsed);
      const utilsFiles = getUtilsFiles(parsed);
      const serviceFiles = getServiceFiles(parsed);
      const configFiles = getConfigFiles(parsed);

      // Step 7: Build analysis result (compatible with createRebuildSchema)
      // Map 'keep' to 'custom' for architecture type compatibility
      const targetArch = input.options?.targetArchitecture;
      const detectedArch: 'clean' | 'feature-first' | 'layer-first' | 'custom' =
        targetArch === 'keep' ? 'custom' : (targetArch || 'feature-first');

      const analysisResult = {
        success: true,
        name: pubspec?.name || parsed.projectName,
        description: pubspec?.description || '',
        flutterVersion: pubspec?.flutter?.version || '3.0.0',
        dartVersion: pubspec?.dart?.minVersion || '3.0.0',
        architecture: {
          detected: detectedArch,
          confidence: 0.8,
          structure: { name: 'lib', path: 'lib', type: 'directory' as const, children: [] },
          reasoning: 'Detected from repomix file',
        },
        dependencies: pubspec?.dependencies || {
          stateManagement: 'provider',
          statePackages: [],
          database: 'none',
          databasePackages: [],
          networking: 'none',
          networkPackages: [],
          navigation: 'go_router',
          navigationPackages: ['go_router'],
          usesFreezed: false,
          usesJsonSerializable: false,
          usesBuildRunner: false,
          all: {},
          dev: {},
        },
        models,
        screens,
        widgets: widgetFiles.map(f => ({
          name: path.basename(f.path, '.dart'),
          filePath: f.path,
          type: 'stateless' as const,
          props: [],
          isReusable: true,
        })),
        theme: undefined,
        stats: {
          totalFiles: parsed.files.length,
          dartFiles: parsed.dartFiles.length,
          testFiles: 0,
          linesOfCode: parsed.dartFiles.reduce((acc, f) => acc + f.content.split('\n').length, 0),
        },
      };

      // Step 8: Create rebuild schema
      const schema = await createRebuildSchema(analysisResult, {
        keepModels: input.options?.keepModels ?? true,
        keepScreenStructure: input.options?.keepScreenStructure ?? true,
        applyEdcDesign: input.options?.applyEdcDesign ?? false,
        addOfflineSupport: input.options?.addOfflineSupport ?? true,
        targetArchitecture: input.options?.targetArchitecture,
        targetStateManagement: input.options?.targetStateManagement,
      });

      // Step 9: Build extracted files bundle (if keepScreenCode is enabled)
      const extractedFiles = input.options?.keepScreenCode ? {
        models: modelFiles,
        screens: screenFiles,
        widgets: widgetFiles,
        providers: stateFiles,
        theme: themeFiles.length > 0 ? themeFiles : undefined,
        utils: utilsFiles.length > 0 ? utilsFiles : undefined,
        services: serviceFiles.length > 0 ? serviceFiles : undefined,
        config: configFiles.length > 0 ? configFiles : undefined,
      } : undefined;

      // Step 10: Rebuild project with extracted files using PROPER MCP FLOW
      // Pass toolCaller and projectEngine so rebuildProject can:
      // 1. Create in-memory project
      // 2. Call MCP tools to configure it
      // 3. Generate files from project configuration via module hooks
      // 4. Write generated files to disk
      // 5. Copy extracted files on top
      const rebuildResult = await rebuildProject(
        schema,
        input.outputPath,
        {
          runFlutterCreate: true,
          formatCode: true,
          extractedFiles,
          toolCaller: context ? async (toolName: string, args: any) => {
            // Import the tool handler registry from the parent context
            // This allows rebuildProject to call other MCP tools like drift_add_table, design_generate_theme, etc.
            const { TOOL_HANDLERS } = await import('../../tools/registry.js');
            const handler = TOOL_HANDLERS.get(toolName);
            if (!handler) {
              console.warn(`[Tool Caller] Tool not found: ${toolName}`);
              return { success: false, error: `Tool not found: ${toolName}` };
            }
            return handler(args, context);
          } : undefined,
          projectEngine: context?.projectEngine, // Pass ProjectEngine for proper MCP flow
        }
      );

      return {
        success: true,
        sourceFile: input.filePath,
        projectName: parsed.projectName,
        analysisInfo: {
          totalFiles: parsed.files.length,
          dartFiles: parsed.dartFiles.length,
          modelsFound: models.length,
          modelFilesFound: modelFiles.length,
          screensFound: screens.length,
          screenFilesFound: screenFiles.length,
          stateFilesFound: stateFiles.length,
          widgetFilesFound: widgetFiles.length,
          themeFilesFound: themeFiles.length,
          utilsFilesFound: utilsFiles.length,
          serviceFilesFound: serviceFiles.length,
          configFilesFound: configFiles.length,
        },
        rebuildInfo: {
          outputPath: rebuildResult.outputPath,
          filesGenerated: rebuildResult.filesGenerated,
          modulesInstalled: rebuildResult.modulesInstalled,
          filesCopied: input.options?.keepScreenCode ?
            screenFiles.length + widgetFiles.length + modelFiles.length +
            stateFiles.length + themeFiles.length + utilsFiles.length +
            serviceFiles.length + configFiles.length : 0,
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
