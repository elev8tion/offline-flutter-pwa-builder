/**
 * GitHub Project Builder
 *
 * Orchestrates the rebuild of a Flutter project from a RebuildSchema
 * by coordinating with existing MCP tools and modules.
 */

import { RebuildSchema } from '../config.js';
import fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  generateDatabaseFile,
  generateWasmConfig,
  generateOpfsConfig,
} from './database-generator.js';
import {
  generateMainDart,
  generatePubspecWithDrift,
  generateBuildYaml,
} from './main-generator.js';
import { DriftTableSchema } from './drift-mapper.js';

export interface ExtractedFiles {
  models?: Array<{ path: string; content: string }>;
  screens?: Array<{ path: string; content: string }>;
  widgets?: Array<{ path: string; content: string }>;
  providers?: Array<{ path: string; content: string }>;
  theme?: Array<{ path: string; content: string }>;
  utils?: Array<{ path: string; content: string }>;
  services?: Array<{ path: string; content: string }>;
  config?: Array<{ path: string; content: string }>;
}

export interface RebuildOptions {
  runFlutterCreate?: boolean;
  formatCode?: boolean;
  generateTests?: boolean;
  extractedFiles?: ExtractedFiles;
  toolCaller?: (toolName: string, args: any) => Promise<any>;
}

export interface RebuildResult {
  success: boolean;
  outputPath: string;
  projectId?: string;
  filesGenerated: number;
  filesCopied: number;
  modulesInstalled: number;
  warnings: string[];
  nextSteps: string[];
  error?: string;
}

/**
 * Setup Drift database with tables, DAOs, and WASM/OPFS config
 */
async function setupDriftDatabase(
  driftSchemas: DriftTableSchema[],
  outputPath: string,
  appName: string
): Promise<void> {
  if (!driftSchemas || driftSchemas.length === 0) {
    return;
  }

  console.log(`[Drift] Setting up database with ${driftSchemas.length} tables...`);

  // Generate database file with all tables and DAOs
  await generateDatabaseFile(driftSchemas, outputPath);
  console.log('[Drift] Generated app_database.dart');

  // Generate WASM configuration for web
  await generateWasmConfig(outputPath);
  console.log('[Drift] Generated WASM configuration');

  // Generate OPFS configuration
  await generateOpfsConfig(outputPath);
  console.log('[Drift] Generated OPFS configuration');

  // Generate main.dart with database initialization
  await generateMainDart(outputPath, appName, true);
  console.log('[Drift] Generated main.dart with database initialization');

  // Generate pubspec.yaml with Drift dependencies
  await generatePubspecWithDrift(outputPath, appName, true);
  console.log('[Drift] Generated pubspec.yaml with Drift dependencies');

  // Generate build.yaml for code generation
  await generateBuildYaml(outputPath);
  console.log('[Drift] Generated build.yaml');

  console.log('[Drift] Database setup complete!');
}

/**
 * Rebuild a Flutter project from a RebuildSchema
 *
 * This function orchestrates the entire rebuild process:
 * 1. Creates output directory structure
 * 2. Generates project configuration files
 * 3. Creates preserved files from original project
 * 4. Generates new code based on generation plan
 * 5. Optionally runs flutter create and dart format
 */
export async function rebuildProject(
  schema: RebuildSchema,
  outputPath: string,
  options: RebuildOptions = {}
): Promise<RebuildResult> {
  const {
    runFlutterCreate = true,
    formatCode = true,
    generateTests = false,
    extractedFiles,
    toolCaller,
  } = options;

  try {
    // 1. Create output directory
    console.log(`Creating output directory: ${outputPath}`);
    await fs.ensureDir(outputPath);

    // 2. Create Flutter project structure
    const projectId = await createProjectStructure(outputPath, schema);

    // 3. Generate configuration files
    await generateConfigFiles(outputPath, schema);

    // 4. Copy extracted files from original project (if provided)
    const filesCopied = await copyExtractedFiles(outputPath, extractedFiles || {});

    // 5. Generate new code files (only for missing files)
    const filesGenerated = await generateCodeFiles(outputPath, schema, extractedFiles || {}, toolCaller, projectId);

    // 6. Setup Drift database if schemas are provided
    if (schema.driftSchemas && schema.driftSchemas.length > 0) {
      console.log('\n[Drift Integration] Setting up offline database...');

      if (toolCaller) {
        // Use actual MCP tools for Drift setup
        console.log('[Drift] Using MCP tools for database setup...');
        for (const tableSchema of schema.driftSchemas) {
          console.log(`[Drift] Adding table: ${tableSchema.name}`);
          await toolCaller('drift_add_table', {
            projectId,
            name: tableSchema.name,
            columns: tableSchema.columns,
            timestamps: true,
            softDelete: false,
          });
        }

        // Enable encryption if needed
        if (schema.projectDefinition.pwa?.offline?.encryption) {
          console.log('[Drift] Enabling database encryption...');
          await toolCaller('drift_enable_encryption', {
            projectId,
            strategy: 'stored',
          });
        }
      } else {
        // Fallback to internal generator
        await setupDriftDatabase(
          schema.driftSchemas,
          outputPath,
          schema.projectDefinition.name
        );
      }
    }

    // 7. Run flutter create if requested
    if (runFlutterCreate) {
      console.log('Running flutter create...');
      try {
        execSync('flutter create . --platforms=web,android,ios', {
          cwd: outputPath,
          stdio: 'pipe',
        });
      } catch {
        schema.warnings.push('flutter create failed - you may need to run it manually');
      }
    }

    // 8. Run dart format if requested
    if (formatCode) {
      console.log('Formatting code...');
      try {
        execSync('dart format .', {
          cwd: outputPath,
          stdio: 'pipe',
        });
      } catch {
        schema.warnings.push('dart format failed - you may need to run it manually');
      }
    }

    // 9. Generate tests if requested
    if (generateTests) {
      await generateTestFiles(outputPath, schema);
    }

    // 10. Return summary
    const hasDrift = schema.driftSchemas && schema.driftSchemas.length > 0;
    const nextSteps = [
      `cd ${outputPath}`,
      runFlutterCreate ? 'flutter pub get' : 'flutter create . && flutter pub get',
    ];

    if (hasDrift) {
      nextSteps.push('dart run build_runner build --delete-conflicting-outputs');
    }

    nextSteps.push('flutter run -d chrome');

    return {
      success: true,
      outputPath,
      projectId,
      filesGenerated,
      filesCopied,
      modulesInstalled: schema.projectDefinition.modules?.length || 0,
      warnings: schema.warnings,
      nextSteps,
    };
  } catch (error) {
    return {
      success: false,
      outputPath,
      filesGenerated: 0,
      filesCopied: 0,
      modulesInstalled: 0,
      warnings: schema.warnings,
      nextSteps: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create the Flutter project directory structure
 */
async function createProjectStructure(
  outputPath: string,
  schema: RebuildSchema
): Promise<string> {
  const projectId = schema.projectDefinition.id || 'rebuilt-project';

  // Create standard Flutter directory structure
  const directories = [
    'lib',
    'lib/models',
    'lib/screens',
    'lib/widgets',
    'lib/providers',
    'lib/theme',
    'lib/services',
    'lib/utils',
    'lib/config',
    'assets',
    'assets/images',
    'assets/fonts',
    'test',
    'test/models',
    'test/screens',
    'test/widgets',
  ];

  for (const dir of directories) {
    await fs.ensureDir(path.join(outputPath, dir));
  }

  return projectId;
}

/**
 * Generate Flutter configuration files (pubspec.yaml, analysis_options.yaml, etc.)
 */
async function generateConfigFiles(
  outputPath: string,
  schema: RebuildSchema
): Promise<void> {
  const projectDef = schema.projectDefinition;

  // Generate pubspec.yaml
  const pubspec = {
    name: projectDef.name,
    description: projectDef.description || 'A Flutter PWA generated by Offline Flutter PWA Builder',
    version: '1.0.0+1',
    environment: {
      sdk: '>=3.0.0 <4.0.0',
    },
    dependencies: {
      flutter: { sdk: 'flutter' },
      ...generateDependencies(schema),
    },
    dev_dependencies: {
      flutter_test: { sdk: 'flutter' },
      flutter_lints: '^3.0.0',
      json_serializable: '^6.8.0',
      build_runner: '^2.4.6',
      drift_dev: '^2.14.0',
    },
    flutter: {
      uses_material_design: true,
      assets: [
        'assets/images/',
        'assets/fonts/',
      ],
    },
  };

  await fs.writeFile(
    path.join(outputPath, 'pubspec.yaml'),
    stringifyYaml(pubspec),
    'utf-8'
  );

  // Generate analysis_options.yaml
  const analysisOptions = `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    - prefer_const_constructors
    - prefer_const_literals_to_create_immutables
    - prefer_final_fields
    - avoid_print
    - prefer_single_quotes
`;

  await fs.writeFile(
    path.join(outputPath, 'analysis_options.yaml'),
    analysisOptions,
    'utf-8'
  );

  // Generate README.md
  const readme = `# ${projectDef.name}

${projectDef.description || 'A Flutter PWA generated by Offline Flutter PWA Builder'}

## Generated Project

This project was generated using the Offline Flutter PWA Builder MCP server.

### Architecture

- **Pattern**: ${schema.projectDefinition.architecture || 'feature-first'}
- **State Management**: ${schema.projectDefinition.stateManagement || 'riverpod'}
- **Offline Support**: ${projectDef.modules?.some((m: any) => m.id === 'drift') ? 'Yes (Drift + WASM + OPFS)' : 'No'}

### Getting Started

1. Install dependencies:
   \`\`\`bash
   flutter pub get
   \`\`\`

2. Run the app:
   \`\`\`bash
   flutter run -d chrome
   \`\`\`

### Modules Installed

${projectDef.modules?.map((m: any) => `- ${m.id}`).join('\n') || '- None'}

### Warnings

${schema.warnings.length > 0 ? schema.warnings.map((w: string) => `- ${w}`).join('\n') : '- None'}
`;

  await fs.writeFile(
    path.join(outputPath, 'README.md'),
    readme,
    'utf-8'
  );
}

/**
 * Generate dependencies based on project configuration
 */
function generateDependencies(schema: RebuildSchema): Record<string, string> {
  const deps: Record<string, string> = {};

  // Core Flutter packages
  deps['provider'] = '^6.1.1';

  // Navigation
  deps['go_router'] = '^14.0.0';

  // Serialization
  deps['equatable'] = '^2.0.5';
  deps['json_annotation'] = '^4.9.0';

  // Add state management dependencies
  if (schema.projectDefinition.stateManagement === 'riverpod') {
    deps['flutter_riverpod'] = '^2.4.0';
    deps['riverpod_annotation'] = '^2.3.0';
  } else if (schema.projectDefinition.stateManagement === 'bloc') {
    deps['flutter_bloc'] = '^8.1.3';
    deps['bloc'] = '^8.1.2';
  }

  // Add module-specific dependencies
  for (const module of schema.projectDefinition.modules || []) {
    if (module.id === 'drift') {
      deps['drift'] = '^2.14.0';
      deps['sqlite3_flutter_libs'] = '^0.5.0';
      deps['path_provider'] = '^2.1.1';
      deps['path'] = '^1.8.3';
    }
  }

  return deps;
}

/**
 * Copy extracted files from original project to output
 */
async function copyExtractedFiles(
  outputPath: string,
  extractedFiles: ExtractedFiles
): Promise<number> {
  let count = 0;

  const copyFilesToDir = async (files: Array<{ path: string; content: string }>, dirName: string) => {
    const targetDir = path.join(outputPath, 'lib', dirName);
    await fs.ensureDir(targetDir);

    for (const file of files) {
      const regex = new RegExp(`.*\\/${dirName}\\/`);
      const relativePath = file.path.replace(regex, '');
      const targetPath = path.join(targetDir, relativePath);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.writeFile(targetPath, file.content, 'utf-8');
      count++;
    }
  };

  if (extractedFiles.models && extractedFiles.models.length > 0) {
    await copyFilesToDir(extractedFiles.models, 'models');
  }

  if (extractedFiles.screens && extractedFiles.screens.length > 0) {
    await copyFilesToDir(extractedFiles.screens, 'screens');
  }

  if (extractedFiles.widgets && extractedFiles.widgets.length > 0) {
    await copyFilesToDir(extractedFiles.widgets, 'widgets');
  }

  if (extractedFiles.providers && extractedFiles.providers.length > 0) {
    await copyFilesToDir(extractedFiles.providers, 'providers');
  }

  if (extractedFiles.theme && extractedFiles.theme.length > 0) {
    await copyFilesToDir(extractedFiles.theme, 'theme');
  }

  if (extractedFiles.utils && extractedFiles.utils.length > 0) {
    await copyFilesToDir(extractedFiles.utils, 'utils');
  }

  if (extractedFiles.services && extractedFiles.services.length > 0) {
    await copyFilesToDir(extractedFiles.services, 'services');
  }

  if (extractedFiles.config && extractedFiles.config.length > 0) {
    await copyFilesToDir(extractedFiles.config, 'config');
  }

  return count;
}

/**
 * Generate code files based on the generation plan
 * Skips placeholder generation when extracted files are provided
 */
async function generateCodeFiles(
  outputPath: string,
  schema: RebuildSchema,
  extractedFiles: ExtractedFiles,
  toolCaller?: (toolName: string, args: any) => Promise<any>,
  projectId?: string
): Promise<number> {
  let count = 0;

  // Generate main.dart (only if Drift is not being set up, as Drift setup will generate it)
  if (!schema.driftSchemas || schema.driftSchemas.length === 0) {
    await generateMainDartBasic(outputPath, schema);
    count++;
  }

  // Generate theme files ONLY if no extracted theme files exist
  if (schema.generationPlan.theme.length > 0 && (!extractedFiles.theme || extractedFiles.theme.length === 0)) {
    if (toolCaller && projectId) {
      // Use actual MCP design tools for theme generation
      console.log('[Theme] Using MCP design tools for theme generation...');
      await toolCaller('design_generate_theme', {
        projectId,
        primaryColor: schema.projectDefinition.pwa?.themeColor || '#6366F1',
        darkMode: true,
        glassmorph: true,
      });
      count++;
    } else {
      // Fallback to internal generator
      await generateThemeFiles(outputPath);
      count += schema.generationPlan.theme.length;
    }
  }

  // Generate model files ONLY if no extracted models exist
  if (!extractedFiles.models || extractedFiles.models.length === 0) {
    for (const model of schema.migrations.models) {
      await generateModelFile(outputPath, model);
      count++;
    }
  }

  // Generate screen files ONLY if no extracted screens exist
  if (!extractedFiles.screens || extractedFiles.screens.length === 0) {
    for (const screen of schema.migrations.screens) {
      await generateScreenFile(outputPath, screen);
      count++;
    }
  }

  // Generate state files ONLY if no extracted providers exist
  if (schema.generationPlan.state.length > 0 && (!extractedFiles.providers || extractedFiles.providers.length === 0)) {
    if (toolCaller && projectId) {
      // Use actual MCP state tools for state management generation
      console.log('[State] Using MCP state tools for provider generation...');
      for (const stateName of schema.generationPlan.state) {
        if (schema.projectDefinition.stateManagement === 'riverpod') {
          await toolCaller('state_create_provider', {
            projectId,
            name: stateName || 'app_state',
            stateType: 'Map<String, dynamic>',
            autoDispose: true,
          });
        } else if (schema.projectDefinition.stateManagement === 'bloc') {
          await toolCaller('state_create_bloc', {
            projectId,
            name: stateName || 'AppBloc',
            events: ['LoadData', 'UpdateData'],
            states: ['Initial', 'Loading', 'Loaded', 'Error'],
            useEquatable: true,
          });
        }
      }
      count += schema.generationPlan.state.length;
    } else {
      // Fallback to internal generator
      await generateStateFiles(outputPath, schema);
      count += schema.generationPlan.state.length;
    }
  }

  return count;
}

/**
 * Generate basic main.dart entry point (without Drift)
 */
async function generateMainDartBasic(
  outputPath: string,
  schema: RebuildSchema
): Promise<void> {
  const useRiverpod = schema.projectDefinition.stateManagement === 'riverpod';

  const mainContent = `import 'package:flutter/material.dart';
${useRiverpod ? "import 'package:flutter_riverpod/flutter_riverpod.dart';" : ''}

void main() {
  runApp(${useRiverpod ? 'const ProviderScope(child: MyApp())' : 'const MyApp()'});
}

class MyApp extends ${useRiverpod ? 'ConsumerWidget' : 'StatelessWidget'} {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context${useRiverpod ? ', WidgetRef ref' : ''}) {
    return MaterialApp(
      title: '${schema.projectDefinition.name}',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${schema.projectDefinition.name}'),
      ),
      body: const Center(
        child: Text('Welcome to your rebuilt Flutter app!'),
      ),
    );
  }
}
`;

  await fs.writeFile(
    path.join(outputPath, 'lib/main.dart'),
    mainContent,
    'utf-8'
  );
}

/**
 * Generate theme files (placeholder)
 */
async function generateThemeFiles(
  outputPath: string
): Promise<void> {
  // Theme generation would use design_generate_full_system tool
  // For now, create a placeholder
  const themeContent = `import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get lightTheme => ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
    useMaterial3: true,
  );

  static ThemeData get darkTheme => ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.deepPurple,
      brightness: Brightness.dark,
    ),
    useMaterial3: true,
  );
}
`;

  await fs.writeFile(
    path.join(outputPath, 'lib/theme/app_theme.dart'),
    themeContent,
    'utf-8'
  );
}

/**
 * Generate model file (placeholder)
 */
async function generateModelFile(
  outputPath: string,
  model: any
): Promise<void> {
  const modelContent = `class ${model.name} {
  // TODO: Implement model based on original structure
  // Original file: ${model.filePath || 'unknown'}
}
`;

  await fs.writeFile(
    path.join(outputPath, `lib/models/${model.name.toLowerCase()}.dart`),
    modelContent,
    'utf-8'
  );
}

/**
 * Generate screen file (placeholder)
 */
async function generateScreenFile(
  outputPath: string,
  screen: any
): Promise<void> {
  const screenContent = `import 'package:flutter/material.dart';

// Original screen: ${screen.name}
// Original file: ${screen.filePath || 'unknown'}
class ${screen.name} extends StatelessWidget {
  const ${screen.name}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${screen.name}'),
      ),
      body: const Center(
        child: Text('Screen content here'),
      ),
    );
  }
}
`;

  await fs.writeFile(
    path.join(outputPath, `lib/screens/${screen.name.toLowerCase()}.dart`),
    screenContent,
    'utf-8'
  );
}

/**
 * Generate state files (placeholder)
 */
async function generateStateFiles(
  outputPath: string,
  schema: RebuildSchema
): Promise<void> {
  // State generation would use state_create_provider or state_create_bloc tools
  // For now, create a placeholder
  if (schema.projectDefinition.stateManagement === 'riverpod') {
    const providerContent = `import 'package:flutter_riverpod/flutter_riverpod.dart';

// Example provider
final exampleProvider = StateProvider<int>((ref) => 0);
`;

    await fs.writeFile(
      path.join(outputPath, 'lib/providers/example_provider.dart'),
      providerContent,
      'utf-8'
    );
  }
}

/**
 * Generate test files (placeholder)
 */
async function generateTestFiles(
  outputPath: string,
  schema: RebuildSchema
): Promise<void> {
  const testContent = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:${schema.projectDefinition.name}/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.text('Welcome to your rebuilt Flutter app!'), findsOneWidget);
  });
}
`;

  await fs.writeFile(
    path.join(outputPath, 'test/widget_test.dart'),
    testContent,
    'utf-8'
  );
}

/**
 * Simple YAML stringifier (basic implementation)
 */
function stringifyYaml(obj: any, indent = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n${stringifyYaml(value, indent + 2)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      for (const item of value) {
        result += `${spaces}  - ${item}\n`;
      }
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }

  return result;
}
