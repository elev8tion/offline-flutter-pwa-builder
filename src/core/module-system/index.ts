/**
 * Module System
 *
 * Manages pluggable modules that extend the PWA builder's functionality.
 * Each module can provide templates, assets, and lifecycle hooks.
 */

import type {
  Module,
  HookContext,
  GeneratedFile,
  ProjectDefinition,
  ModuleSystem as IModuleSystem,
  FileSystem,
  TemplateEngine,
} from "../types.js";

// ============================================================================
// MODULE REGISTRY
// ============================================================================

export class ModuleSystem implements IModuleSystem {
  private modules: Map<string, Module> = new Map();
  private installedModules: Map<string, Set<string>> = new Map(); // projectId -> Set<moduleId>

  register(module: Module): void {
    // Validate module
    this.validateModule(module);

    // Check for conflicts with existing modules
    for (const existingModule of this.modules.values()) {
      if (existingModule.conflicts.includes(module.id)) {
        throw new Error(
          `Module ${module.id} conflicts with existing module ${existingModule.id}`
        );
      }
      if (module.conflicts.includes(existingModule.id)) {
        throw new Error(
          `Module ${module.id} conflicts with existing module ${existingModule.id}`
        );
      }
    }

    this.modules.set(module.id, module);
  }

  unregister(moduleId: string): void {
    // Check if module is installed in any project
    for (const [projectId, modules] of this.installedModules) {
      if (modules.has(moduleId)) {
        throw new Error(
          `Cannot unregister module ${moduleId}: still installed in project ${projectId}`
        );
      }
    }

    this.modules.delete(moduleId);
  }

  get(moduleId: string): Module | undefined {
    return this.modules.get(moduleId);
  }

  list(): Module[] {
    return Array.from(this.modules.values());
  }

  async install(
    projectId: string,
    moduleId: string,
    _config?: Record<string, unknown>
  ): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    // Check dependencies
    for (const dep of module.dependencies) {
      if (!dep.optional) {
        const installed = this.installedModules.get(projectId);
        if (!installed?.has(dep.id)) {
          throw new Error(
            `Module ${moduleId} requires ${dep.id} which is not installed`
          );
        }
      }
    }

    // Check conflicts
    const installed = this.installedModules.get(projectId);
    if (installed) {
      for (const conflict of module.conflicts) {
        if (installed.has(conflict)) {
          throw new Error(
            `Module ${moduleId} conflicts with installed module ${conflict}`
          );
        }
      }
    }

    // Mark as installed
    if (!this.installedModules.has(projectId)) {
      this.installedModules.set(projectId, new Set());
    }
    this.installedModules.get(projectId)!.add(moduleId);
  }

  async uninstall(projectId: string, moduleId: string): Promise<void> {
    const installed = this.installedModules.get(projectId);
    if (!installed?.has(moduleId)) {
      throw new Error(`Module ${moduleId} is not installed in project ${projectId}`);
    }

    // Check if other modules depend on this one
    for (const otherModuleId of installed) {
      if (otherModuleId === moduleId) continue;

      const otherModule = this.modules.get(otherModuleId);
      if (otherModule) {
        for (const dep of otherModule.dependencies) {
          if (dep.id === moduleId && !dep.optional) {
            throw new Error(
              `Cannot uninstall ${moduleId}: required by ${otherModuleId}`
            );
          }
        }
      }
    }

    installed.delete(moduleId);
  }

  getInstalled(projectId: string): Module[] {
    const installed = this.installedModules.get(projectId);
    if (!installed) return [];

    return Array.from(installed)
      .map((id) => this.modules.get(id))
      .filter((m): m is Module => m !== undefined);
  }

  isInstalled(projectId: string, moduleId: string): boolean {
    return this.installedModules.get(projectId)?.has(moduleId) ?? false;
  }

  private validateModule(module: Module): void {
    if (!module.id) {
      throw new Error("Module must have an id");
    }
    if (!module.name) {
      throw new Error("Module must have a name");
    }
    if (!module.version) {
      throw new Error("Module must have a version");
    }
  }
}

// ============================================================================
// HOOK EXECUTOR
// ============================================================================

export class HookExecutor {
  private fileSystem: FileSystem;
  private templateEngine: TemplateEngine;

  constructor(
    _moduleSystem: ModuleSystem,
    fileSystem: FileSystem,
    templateEngine: TemplateEngine
  ) {
    this.fileSystem = fileSystem;
    this.templateEngine = templateEngine;
  }

  async executeOnInstall(project: ProjectDefinition, module: Module): Promise<void> {
    if (module.hooks.onInstall) {
      const ctx = this.createContext(project, module);
      await module.hooks.onInstall(ctx);
    }
  }

  async executeBeforeGenerate(
    project: ProjectDefinition,
    modules: Module[]
  ): Promise<void> {
    for (const module of modules) {
      if (module.hooks.beforeGenerate) {
        const ctx = this.createContext(project, module);
        await module.hooks.beforeGenerate(ctx);
      }
    }
  }

  async executeOnGenerate(
    project: ProjectDefinition,
    modules: Module[]
  ): Promise<GeneratedFile[]> {
    const allFiles: GeneratedFile[] = [];

    for (const module of modules) {
      if (module.hooks.onGenerate) {
        const ctx = this.createContext(project, module);
        const files = await module.hooks.onGenerate(ctx);
        allFiles.push(...files);
      }
    }

    return allFiles;
  }

  async executeAfterGenerate(
    project: ProjectDefinition,
    modules: Module[]
  ): Promise<void> {
    for (const module of modules) {
      if (module.hooks.afterGenerate) {
        const ctx = this.createContext(project, module);
        await module.hooks.afterGenerate(ctx);
      }
    }
  }

  async executeBeforeBuild(
    project: ProjectDefinition,
    modules: Module[]
  ): Promise<void> {
    for (const module of modules) {
      if (module.hooks.beforeBuild) {
        const ctx = this.createContext(project, module);
        await module.hooks.beforeBuild(ctx);
      }
    }
  }

  async executeAfterBuild(
    project: ProjectDefinition,
    modules: Module[]
  ): Promise<void> {
    for (const module of modules) {
      if (module.hooks.afterBuild) {
        const ctx = this.createContext(project, module);
        await module.hooks.afterBuild(ctx);
      }
    }
  }

  async executeOnUninstall(project: ProjectDefinition, module: Module): Promise<void> {
    if (module.hooks.onUninstall) {
      const ctx = this.createContext(project, module);
      await module.hooks.onUninstall(ctx);
    }
  }

  private createContext(project: ProjectDefinition, module: Module): HookContext {
    return {
      project,
      module,
      fileSystem: this.fileSystem,
      templateEngine: this.templateEngine,
    };
  }
}

// ============================================================================
// DEPENDENCY RESOLVER
// ============================================================================

export class DependencyResolver {
  private moduleSystem: ModuleSystem;

  constructor(moduleSystem: ModuleSystem) {
    this.moduleSystem = moduleSystem;
  }

  /**
   * Resolve module dependencies in order (topological sort)
   */
  resolve(moduleIds: string[]): Module[] {
    const resolved: Module[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (moduleId: string): void => {
      if (visited.has(moduleId)) return;
      if (visiting.has(moduleId)) {
        throw new Error(`Circular dependency detected: ${moduleId}`);
      }

      visiting.add(moduleId);

      const module = this.moduleSystem.get(moduleId);
      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Visit dependencies first
      for (const dep of module.dependencies) {
        if (!dep.optional && moduleIds.includes(dep.id)) {
          visit(dep.id);
        }
      }

      visiting.delete(moduleId);
      visited.add(moduleId);
      resolved.push(module);
    };

    for (const moduleId of moduleIds) {
      visit(moduleId);
    }

    return resolved;
  }

  /**
   * Check if all required dependencies are satisfied
   */
  checkDependencies(moduleIds: string[]): { satisfied: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const moduleId of moduleIds) {
      const module = this.moduleSystem.get(moduleId);
      if (!module) continue;

      for (const dep of module.dependencies) {
        if (!dep.optional && !moduleIds.includes(dep.id)) {
          if (!missing.includes(dep.id)) {
            missing.push(dep.id);
          }
        }
      }
    }

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }
}
