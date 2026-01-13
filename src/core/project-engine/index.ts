/**
 * Project Engine
 *
 * Manages project lifecycle: creation, configuration, generation, and validation.
 * Central coordinator for all other engines.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ProjectDefinition,
  PWAConfig,
  OfflineConfig,
  GeneratedFile,
  ValidationResult,
  FileSystem,
  TemplateEngine,
  ValidationFramework,
  ProjectEngine as IProjectEngine,
} from "../types.js";
import { ModuleSystem, HookExecutor, DependencyResolver } from "../module-system/index.js";

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_PWA_CONFIG: PWAConfig = {
  name: "My PWA",
  shortName: "MyPWA",
  description: "An offline-first Progressive Web Application",
  themeColor: "#2196F3",
  backgroundColor: "#FFFFFF",
  display: "standalone",
  orientation: "any",
  icons: [],
  startUrl: "/",
  scope: "/",
};

const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  strategy: "offline-first",
  storage: {
    type: "drift",
    encryption: false,
  },
  caching: {
    assets: true,
    api: true,
    ttl: 3600,
  },
};

// ============================================================================
// PROJECT ENGINE IMPLEMENTATION
// ============================================================================

export class ProjectEngine implements IProjectEngine {
  private projects: Map<string, ProjectDefinition> = new Map();
  private fileSystem: FileSystem;
  private templateEngine: TemplateEngine;
  private moduleSystem: ModuleSystem;
  private validationFramework: ValidationFramework;
  private hookExecutor: HookExecutor;
  private dependencyResolver: DependencyResolver;

  constructor(
    fileSystem: FileSystem,
    templateEngine: TemplateEngine,
    moduleSystem: ModuleSystem,
    validationFramework: ValidationFramework
  ) {
    this.fileSystem = fileSystem;
    this.templateEngine = templateEngine;
    this.moduleSystem = moduleSystem;
    this.validationFramework = validationFramework;
    this.hookExecutor = new HookExecutor(this.moduleSystem, this.fileSystem, this.templateEngine);
    this.dependencyResolver = new DependencyResolver(this.moduleSystem);
  }

  async create(definition: Partial<ProjectDefinition>): Promise<ProjectDefinition> {
    const now = new Date().toISOString();

    // Generate project with defaults
    const project: ProjectDefinition = {
      id: definition.id ?? uuidv4(),
      name: definition.name ?? "untitled-project",
      displayName: definition.displayName ?? definition.name ?? "Untitled Project",
      version: definition.version ?? "1.0.0",
      pwa: {
        ...DEFAULT_PWA_CONFIG,
        ...definition.pwa,
        name: definition.pwa?.name ?? definition.displayName ?? "My PWA",
        shortName: definition.pwa?.shortName ?? definition.name ?? "MyPWA",
      },
      offline: {
        ...DEFAULT_OFFLINE_CONFIG,
        ...definition.offline,
        storage: {
          ...DEFAULT_OFFLINE_CONFIG.storage,
          ...definition.offline?.storage,
        },
        caching: {
          ...DEFAULT_OFFLINE_CONFIG.caching,
          ...definition.offline?.caching,
        },
      },
      architecture: definition.architecture ?? "feature-first",
      stateManagement: definition.stateManagement ?? "riverpod",
      modules: definition.modules ?? [],
      targets: definition.targets ?? ["web"],
      createdAt: now,
      updatedAt: now,
    };

    // Validate project
    const validation = await this.validate(project.id);
    if (!validation.valid) {
      const errors = validation.issues.filter((i) => i.severity === "error");
      if (errors.length > 0) {
        throw new Error(`Invalid project: ${errors.map((e) => e.message).join(", ")}`);
      }
    }

    // Store project
    this.projects.set(project.id, project);

    // Install enabled modules
    for (const moduleConfig of project.modules) {
      if (moduleConfig.enabled) {
        await this.moduleSystem.install(project.id, moduleConfig.id, moduleConfig.config);
      }
    }

    return project;
  }

  get(id: string): ProjectDefinition | undefined {
    return this.projects.get(id);
  }

  async update(
    id: string,
    updates: Partial<ProjectDefinition>
  ): Promise<ProjectDefinition> {
    const existing = this.projects.get(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const updated: ProjectDefinition = {
      ...existing,
      ...updates,
      id: existing.id, // ID cannot be changed
      createdAt: existing.createdAt, // Created date cannot be changed
      updatedAt: new Date().toISOString(),
      pwa: {
        ...existing.pwa,
        ...updates.pwa,
      },
      offline: {
        ...existing.offline,
        ...updates.offline,
        storage: {
          ...existing.offline.storage,
          ...updates.offline?.storage,
        },
        caching: {
          ...existing.offline.caching,
          ...updates.offline?.caching,
        },
      },
    };

    // Handle module changes
    if (updates.modules) {
      const existingModuleIds = new Set(existing.modules.map((m) => m.id));
      const updatedModuleIds = new Set(updates.modules.map((m) => m.id));

      // Uninstall removed modules
      for (const moduleId of existingModuleIds) {
        if (!updatedModuleIds.has(moduleId)) {
          await this.moduleSystem.uninstall(id, moduleId);
        }
      }

      // Install new modules
      for (const moduleConfig of updates.modules) {
        if (moduleConfig.enabled && !existingModuleIds.has(moduleConfig.id)) {
          await this.moduleSystem.install(id, moduleConfig.id, moduleConfig.config);
        }
      }
    }

    this.projects.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }

    // Uninstall all modules
    const installedModules = this.moduleSystem.getInstalled(id);
    for (const module of installedModules) {
      await this.moduleSystem.uninstall(id, module.id);
    }

    this.projects.delete(id);
  }

  list(): ProjectDefinition[] {
    return Array.from(this.projects.values());
  }

  async generate(id: string): Promise<GeneratedFile[]> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }

    const files: GeneratedFile[] = [];

    // Get installed modules in dependency order
    const moduleIds = project.modules.filter((m) => m.enabled).map((m) => m.id);
    const modules = this.dependencyResolver.resolve(moduleIds);

    // Execute beforeGenerate hooks
    await this.hookExecutor.executeBeforeGenerate(project, modules);

    // Generate core project files
    const coreFiles = await this.generateCoreFiles(project);
    files.push(...coreFiles);

    // Execute onGenerate hooks for each module
    const moduleFiles = await this.hookExecutor.executeOnGenerate(project, modules);
    files.push(...moduleFiles);

    // Execute afterGenerate hooks
    await this.hookExecutor.executeAfterGenerate(project, modules);

    return files;
  }

  async validate(id: string): Promise<ValidationResult> {
    const project = this.projects.get(id);
    if (!project) {
      // For new projects, validate the definition structure
      return { valid: true, issues: [] };
    }

    return this.validationFramework.validateProject(project);
  }

  async build(id: string, outputPath: string): Promise<void> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }

    // Validate before building
    const validation = await this.validate(id);
    if (!validation.valid) {
      const errors = validation.issues.filter((i) => i.severity === "error");
      if (errors.length > 0) {
        throw new Error(`Cannot build: ${errors.map((e) => e.message).join(", ")}`);
      }
    }

    // Get modules
    const moduleIds = project.modules.filter((m) => m.enabled).map((m) => m.id);
    const modules = this.dependencyResolver.resolve(moduleIds);

    // Execute beforeBuild hooks
    await this.hookExecutor.executeBeforeBuild(project, modules);

    // Generate files
    const files = await this.generate(id);

    // Write files to output
    const transaction = this.fileSystem.beginTransaction();

    try {
      for (const file of files) {
        const fullPath = `${outputPath}/${file.path}`;
        transaction.write(fullPath, file.content);
      }

      await transaction.commit();
    } catch (error) {
      transaction.rollback();
      throw error;
    }

    // Execute afterBuild hooks
    await this.hookExecutor.executeAfterBuild(project, modules);
  }

  private async generateCoreFiles(project: ProjectDefinition): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate pubspec.yaml
    files.push({
      path: "pubspec.yaml",
      content: this.generatePubspec(project),
    });

    // Generate main.dart
    files.push({
      path: "lib/main.dart",
      content: this.generateMainDart(project),
    });

    // Generate app.dart
    files.push({
      path: "lib/app.dart",
      content: this.generateAppDart(project),
    });

    // Generate directory structure based on architecture
    files.push(...this.generateArchitectureFiles(project));

    return files;
  }

  private generatePubspec(project: ProjectDefinition): string {
    const dependencies: Record<string, string> = {
      flutter: "sdk: flutter",
    };

    // Add state management dependency
    switch (project.stateManagement) {
      case "riverpod":
        dependencies["flutter_riverpod"] = "^2.4.0";
        dependencies["riverpod_annotation"] = "^2.3.0";
        break;
      case "bloc":
        dependencies["flutter_bloc"] = "^8.1.0";
        dependencies["bloc"] = "^8.1.0";
        break;
      case "provider":
        dependencies["provider"] = "^6.1.0";
        break;
    }

    // Add offline dependencies
    if (project.offline.storage.type === "drift") {
      dependencies["drift"] = "^2.14.0";
      dependencies["drift_sqflite"] = "^2.2.0";
      dependencies["sqlite3_flutter_libs"] = "^0.5.18";
    }

    const depString = Object.entries(dependencies)
      .map(([name, version]) => `  ${name}: ${version}`)
      .join("\n");

    return `name: ${project.name}
description: ${project.pwa.description}
version: ${project.version}
publish_to: 'none'

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
${depString}

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.0
${project.stateManagement === "riverpod" ? "  riverpod_generator: ^2.3.0" : ""}
${project.offline.storage.type === "drift" ? "  drift_dev: ^2.14.0" : ""}

flutter:
  uses-material-design: true
`;
  }

  private generateMainDart(project: ProjectDefinition): string {
    const imports: string[] = [
      "import 'package:flutter/material.dart';",
    ];

    let runApp = "runApp(const App());";

    if (project.stateManagement === "riverpod") {
      imports.push("import 'package:flutter_riverpod/flutter_riverpod.dart';");
      runApp = "runApp(const ProviderScope(child: App()));";
    }

    imports.push(`import 'app.dart';`);

    return `${imports.join("\n")}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ${runApp}
}
`;
  }

  private generateAppDart(project: ProjectDefinition): string {
    return `import 'package:flutter/material.dart';

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${project.pwa.name}',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF${project.pwa.themeColor.replace("#", "")}),
        ),
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
        title: const Text('${project.pwa.name}'),
      ),
      body: const Center(
        child: Text('Welcome to ${project.pwa.name}!'),
      ),
    );
  }
}
`;
  }

  private generateArchitectureFiles(project: ProjectDefinition): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    switch (project.architecture) {
      case "clean":
        files.push(
          { path: "lib/domain/entities/.gitkeep", content: "" },
          { path: "lib/domain/repositories/.gitkeep", content: "" },
          { path: "lib/domain/usecases/.gitkeep", content: "" },
          { path: "lib/data/models/.gitkeep", content: "" },
          { path: "lib/data/repositories/.gitkeep", content: "" },
          { path: "lib/data/datasources/.gitkeep", content: "" },
          { path: "lib/presentation/pages/.gitkeep", content: "" },
          { path: "lib/presentation/widgets/.gitkeep", content: "" },
          { path: "lib/core/constants/.gitkeep", content: "" },
          { path: "lib/core/errors/.gitkeep", content: "" },
          { path: "lib/core/utils/.gitkeep", content: "" }
        );
        break;

      case "feature-first":
        files.push(
          { path: "lib/features/.gitkeep", content: "" },
          { path: "lib/shared/widgets/.gitkeep", content: "" },
          { path: "lib/shared/services/.gitkeep", content: "" },
          { path: "lib/shared/models/.gitkeep", content: "" },
          { path: "lib/core/constants/.gitkeep", content: "" },
          { path: "lib/core/theme/.gitkeep", content: "" },
          { path: "lib/core/utils/.gitkeep", content: "" }
        );
        break;

      case "layer-first":
        files.push(
          { path: "lib/models/.gitkeep", content: "" },
          { path: "lib/services/.gitkeep", content: "" },
          { path: "lib/providers/.gitkeep", content: "" },
          { path: "lib/screens/.gitkeep", content: "" },
          { path: "lib/widgets/.gitkeep", content: "" },
          { path: "lib/utils/.gitkeep", content: "" },
          { path: "lib/constants/.gitkeep", content: "" }
        );
        break;
    }

    return files;
  }
}
