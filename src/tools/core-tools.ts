/**
 * Core MCP tools and handlers.
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext, ProjectDefinition } from "../core/types.js";
import { formatValidationResult } from "../core/validation-framework/index.js";

// ============================================================================
// TOOL SCHEMAS (Zod validation)
// ============================================================================

const ProjectCreateSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  displayName: z.string().optional(),
  description: z.string().optional(),
  architecture: z.enum(["clean", "feature-first", "layer-first"]).optional(),
  stateManagement: z.enum(["riverpod", "bloc", "provider"]).optional(),
  targets: z.array(z.enum(["web", "android", "ios", "windows", "macos", "linux"])).optional(),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  offlineStrategy: z.enum(["offline-first", "online-first", "cache-first"]).optional(),
  encryption: z.boolean().optional(),
});

const ProjectBuildSchema = z.object({
  projectId: z.string().uuid(),
  outputPath: z.string().min(1),
});

const ProjectValidateSchema = z.object({
  projectId: z.string().uuid(),
});

const ProjectExportFilesSchema = z.object({
  projectId: z.string().uuid(),
  outputPath: z.string().min(1),
  files: z.array(z.string()).optional(),
  includeAssets: z.boolean().default(false),
  createFlutterProject: z.boolean().default(false),
});

const ProjectValidateBuildSchema = z.object({
  projectId: z.string().uuid(),
});

const ModuleInstallSchema = z.object({
  projectId: z.string().uuid(),
  moduleId: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

const TemplatePreviewSchema = z.object({
  templateId: z.string().min(1),
  projectId: z.string().uuid().optional(),
  data: z.record(z.unknown()).optional(),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const CORE_TOOLS: Tool[] = [
  // ===== PHASE 1: CORE TOOLS =====
  {
    name: "project_create",
    description: "Create a new offline-first Flutter PWA project",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name (lowercase, underscores allowed)",
        },
        displayName: {
          type: "string",
          description: "Display name for the app",
        },
        description: {
          type: "string",
          description: "App description for PWA manifest",
        },
        architecture: {
          type: "string",
          enum: ["clean", "feature-first", "layer-first"],
          description: "Project architecture pattern",
        },
        stateManagement: {
          type: "string",
          enum: ["riverpod", "bloc", "provider"],
          description: "State management solution",
        },
        targets: {
          type: "array",
          items: {
            type: "string",
            enum: ["web", "android", "ios", "windows", "macos", "linux"],
          },
          description: "Target platforms",
        },
        themeColor: {
          type: "string",
          description: "Theme color (hex, e.g., #2196F3)",
        },
        backgroundColor: {
          type: "string",
          description: "Background color (hex)",
        },
        offlineStrategy: {
          type: "string",
          enum: ["offline-first", "online-first", "cache-first"],
          description: "Offline caching strategy",
        },
        encryption: {
          type: "boolean",
          description: "Enable encrypted storage",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "project_list",
    description: "List all projects",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "project_get",
    description: "Get project details by ID",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_update",
    description: "Update project configuration",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        displayName: {
          type: "string",
          description: "Display name for the app",
        },
        description: {
          type: "string",
          description: "App description",
        },
        architecture: {
          type: "string",
          enum: ["clean", "feature-first", "layer-first"],
          description: "Project architecture pattern",
        },
        stateManagement: {
          type: "string",
          enum: ["riverpod", "bloc", "provider"],
          description: "State management solution",
        },
        targets: {
          type: "array",
          items: {
            type: "string",
            enum: ["web", "android", "ios", "windows", "macos", "linux"],
          },
          description: "Target platforms",
        },
        themeColor: {
          type: "string",
          description: "Theme color (hex)",
        },
        backgroundColor: {
          type: "string",
          description: "Background color (hex)",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_delete",
    description: "Delete a project by ID",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_build",
    description: "Build project and output files",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        outputPath: {
          type: "string",
          description: "Output directory path",
        },
      },
      required: ["projectId", "outputPath"],
    },
  },
  {
    name: "project_validate",
    description: "Validate project configuration and structure",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_export_files",
    description: "Export files without full build pipeline",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        outputPath: {
          type: "string",
          description: "Output directory path",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Specific files to export (optional)",
        },
        includeAssets: {
          type: "boolean",
          description: "Include asset files",
        },
        createFlutterProject: {
          type: "boolean",
          description: "Run flutter create first",
        },
      },
      required: ["projectId", "outputPath"],
    },
  },
  {
    name: "project_validate_build",
    description: "Pre-flight check before build",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "project_configure_environment",
    description: "Configure environment variables and settings",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        environment: {
          type: "string",
          enum: ["development", "staging", "production"],
          description: "Environment name",
        },
        variables: {
          type: "object",
          description: "Environment variables as key-value pairs",
        },
      },
      required: ["projectId", "environment", "variables"],
    },
  },
  {
    name: "module_list",
    description: "List all available modules",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "module_info",
    description: "Get detailed information about a module",
    inputSchema: {
      type: "object",
      properties: {
        moduleId: {
          type: "string",
          description: "Module ID",
        },
      },
      required: ["moduleId"],
    },
  },
  {
    name: "module_install",
    description: "Install a module into a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        moduleId: {
          type: "string",
          description: "Module ID to install",
        },
        config: {
          type: "object",
          description: "Module configuration",
        },
      },
      required: ["projectId", "moduleId"],
    },
  },
  {
    name: "module_uninstall",
    description: "Remove a module from a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        moduleId: {
          type: "string",
          description: "Module ID to uninstall",
        },
      },
      required: ["projectId", "moduleId"],
    },
  },
  {
    name: "template_list",
    description: "List all available templates",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "template_preview",
    description: "Preview a template with sample data",
    inputSchema: {
      type: "object",
      properties: {
        templateId: {
          type: "string",
          description: "Template ID",
        },
        projectId: {
          type: "string",
          description: "Project ID for context",
        },
        data: {
          type: "object",
          description: "Additional template data",
        },
      },
      required: ["templateId"],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handleCoreToolCall(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  switch (name) {
    // ===== PROJECT TOOLS =====
    case "project_create": {
      const parsed = ProjectCreateSchema.parse(args);

      const project = await context.projectEngine.create({
        name: parsed.name,
        displayName: parsed.displayName ?? parsed.name,
        pwa: {
          name: parsed.displayName ?? parsed.name,
          shortName: parsed.name.substring(0, 12),
          description: parsed.description ?? "",
          themeColor: parsed.themeColor ?? "#2196F3",
          backgroundColor: parsed.backgroundColor ?? "#FFFFFF",
          display: "standalone",
          orientation: "any",
          icons: [],
          startUrl: "/",
          scope: "/",
        },
        offline: {
          strategy: parsed.offlineStrategy ?? "offline-first",
          storage: {
            type: "drift",
            encryption: parsed.encryption ?? false,
          },
          caching: {
            assets: true,
            api: true,
            ttl: 3600,
          },
        },
        architecture: parsed.architecture ?? "feature-first",
        stateManagement: parsed.stateManagement ?? "riverpod",
        targets: parsed.targets ?? ["web"],
        modules: [],
      });

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          displayName: project.displayName,
          architecture: project.architecture,
          stateManagement: project.stateManagement,
          targets: project.targets,
        },
        message: `Project '${project.name}' created successfully`,
      };
    }

    case "project_list": {
      const projects = context.projectEngine.list();
      return {
        count: projects.length,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          displayName: p.displayName,
          architecture: p.architecture,
          stateManagement: p.stateManagement,
          targets: p.targets,
          createdAt: p.createdAt,
        })),
      };
    }

    case "project_get": {
      const { projectId } = args as { projectId: string };
      const project = context.projectEngine.get(projectId);

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      return project;
    }

    case "project_update": {
      const { projectId, ...updates } = args as {
        projectId: string;
        displayName?: string;
        description?: string;
        architecture?: "clean" | "feature-first" | "layer-first";
        stateManagement?: "riverpod" | "bloc" | "provider";
        targets?: Array<"web" | "android" | "ios" | "windows" | "macos" | "linux">;
        themeColor?: string;
        backgroundColor?: string;
      };

      const project = context.projectEngine.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Update project with provided fields
      const updatedFields: Partial<ProjectDefinition> = {};
      if (updates.displayName) updatedFields.displayName = updates.displayName;
      if (updates.architecture) updatedFields.architecture = updates.architecture;
      if (updates.stateManagement) updatedFields.stateManagement = updates.stateManagement;
      if (updates.targets) updatedFields.targets = updates.targets;

      // Update PWA config if theme/background colors provided
      if (updates.themeColor || updates.backgroundColor) {
        updatedFields.pwa = {
          ...project.pwa,
          ...(updates.themeColor && { themeColor: updates.themeColor }),
          ...(updates.backgroundColor && { backgroundColor: updates.backgroundColor }),
        };
      }

      updatedFields.updatedAt = new Date().toISOString();

      context.projectEngine.update(projectId, updatedFields);

      return {
        success: true,
        projectId,
        message: `Project '${project.name}' updated successfully`,
        updated: Object.keys(updates),
      };
    }

    case "project_delete": {
      const { projectId } = args as { projectId: string };

      const project = context.projectEngine.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      context.projectEngine.delete(projectId);

      return {
        success: true,
        projectId,
        message: `Project '${project.name}' deleted successfully`,
      };
    }

    case "project_build": {
      const parsed = ProjectBuildSchema.parse(args);
      await context.projectEngine.build(parsed.projectId, parsed.outputPath);

      return {
        success: true,
        message: `Project built to ${parsed.outputPath}`,
      };
    }

    case "project_validate": {
      const parsed = ProjectValidateSchema.parse(args);
      const result = await context.projectEngine.validate(parsed.projectId);

      return {
        valid: result.valid,
        summary: formatValidationResult(result),
        issues: result.issues,
      };
    }

    case "project_export_files": {
      const parsed = ProjectExportFilesSchema.parse(args);

      // Get the project
      const project = context.projectEngine.get(parsed.projectId);
      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Generate all files
      const allFiles = await context.projectEngine.generate(parsed.projectId);

      // Filter files if specific files were requested
      const filesToExport = parsed.files
        ? allFiles.filter((f) => parsed.files!.includes(f.path))
        : allFiles;

      // Run flutter create if requested
      if (parsed.createFlutterProject) {
        // Note: In a real implementation, this would execute:
        // await exec(`flutter create ${parsed.outputPath}`);
      }

      // Write files using file system
      const transaction = context.fileSystem.beginTransaction();

      try {
        for (const file of filesToExport) {
          const fullPath = `${parsed.outputPath}/${file.path}`;
          transaction.write(fullPath, file.content);
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      return {
        success: true,
        outputPath: parsed.outputPath,
        filesExported: filesToExport.length,
        message: `Exported ${filesToExport.length} files to ${parsed.outputPath}`,
      };
    }

    case "project_validate_build": {
      const parsed = ProjectValidateBuildSchema.parse(args);

      // Get the project
      const project = context.projectEngine.get(parsed.projectId);
      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      const issues: Array<{ type: string; severity: string; message: string }> = [];

      // Check that all enabled modules exist in the registry
      for (const moduleConfig of project.modules) {
        if (moduleConfig.enabled) {
          const module = context.moduleSystem.get(moduleConfig.id);
          if (!module) {
            issues.push({
              type: "module",
              severity: "error",
              message: `Module '${moduleConfig.id}' is enabled but not found in registry`,
            });
          }
        }
      }

      // Check for missing dependencies between modules
      const enabledModuleIds = project.modules
        .filter((m) => m.enabled)
        .map((m) => m.id);

      for (const moduleId of enabledModuleIds) {
        const module = context.moduleSystem.get(moduleId);
        if (module) {
          for (const dep of module.dependencies) {
            if (!dep.optional && !enabledModuleIds.includes(dep.id)) {
              issues.push({
                type: "dependency",
                severity: "error",
                message: `Module '${moduleId}' requires '${dep.id}' but it is not enabled`,
              });
            }
          }
        }
      }

      // Check for module conflicts
      for (const moduleId of enabledModuleIds) {
        const module = context.moduleSystem.get(moduleId);
        if (module) {
          for (const conflictId of module.conflicts) {
            if (enabledModuleIds.includes(conflictId)) {
              issues.push({
                type: "conflict",
                severity: "error",
                message: `Module '${moduleId}' conflicts with '${conflictId}'`,
              });
            }
          }
        }
      }

      // Check for target compatibility
      for (const moduleId of enabledModuleIds) {
        const module = context.moduleSystem.get(moduleId);
        if (module) {
          const incompatibleTargets = project.targets.filter(
            (target) => !module.compatibleTargets.includes(target)
          );
          if (incompatibleTargets.length > 0) {
            issues.push({
              type: "compatibility",
              severity: "warning",
              message: `Module '${moduleId}' is not compatible with targets: ${incompatibleTargets.join(", ")}`,
            });
          }
        }
      }

      const valid = !issues.some((i) => i.severity === "error");

      return {
        valid,
        issues,
        summary: `Found ${issues.length} issue${issues.length !== 1 ? "s" : ""} (${issues.filter((i) => i.severity === "error").length} errors, ${issues.filter((i) => i.severity === "warning").length} warnings)`,
      };
    }

    case "project_configure_environment": {
      const { projectId, environment, variables } = args as {
        projectId: string;
        environment: "development" | "staging" | "production";
        variables: Record<string, string>;
      };

      const project = context.projectEngine.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Generate .env file content
      const envContent = Object.entries(variables)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

      // Generate Dart environment configuration file
      const dartEnvClass = `// Generated environment configuration
// Environment: ${environment}

class Environment {
  static const String name = '${environment}';

${Object.entries(variables)
  .map(([key, value]) => `  static const String ${key} = '${value}';`)
  .join("\n")}

  // Check if running in development
  static bool get isDevelopment => name == 'development';

  // Check if running in staging
  static bool get isStaging => name == 'staging';

  // Check if running in production
  static bool get isProduction => name == 'production';
}`;

      return {
        success: true,
        environment,
        variableCount: Object.keys(variables).length,
        files: {
          ".env": envContent,
          "lib/config/environment.dart": dartEnvClass,
        },
        message: `Environment '${environment}' configured with ${Object.keys(variables).length} variables`,
        instructions: [
          "Add .env to your .gitignore file",
          "Use flutter_dotenv package to load .env variables",
          "Import lib/config/environment.dart to access environment constants",
          `Run with: flutter run --dart-define=ENVIRONMENT=${environment}`,
        ],
      };
    }

    // ===== MODULE TOOLS =====
    case "module_list": {
      const modules = context.moduleSystem.list();
      return {
        count: modules.length,
        modules: modules.map((m) => ({
          id: m.id,
          name: m.name,
          version: m.version,
          description: m.description,
          compatibleTargets: m.compatibleTargets,
        })),
      };
    }

    case "module_info": {
      const { moduleId } = args as { moduleId: string };
      const module = context.moduleSystem.get(moduleId);

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      return {
        id: module.id,
        name: module.name,
        version: module.version,
        description: module.description,
        compatibleTargets: module.compatibleTargets,
        dependencies: module.dependencies,
        conflicts: module.conflicts,
        configSchema: module.configSchema,
        defaultConfig: module.defaultConfig,
        templateCount: module.templates.length,
        assetCount: module.assets.length,
      };
    }

    case "module_install": {
      const parsed = ModuleInstallSchema.parse(args);

      // Get the project
      const project = context.projectEngine.get(parsed.projectId);
      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Register with module system
      await context.moduleSystem.install(
        parsed.projectId,
        parsed.moduleId,
        parsed.config
      );

      // Add module to project's modules array if not already present
      const existingModuleIndex = project.modules.findIndex((m) => m.id === parsed.moduleId);
      if (existingModuleIndex >= 0) {
        // Update existing module config
        project.modules[existingModuleIndex].config = {
          ...project.modules[existingModuleIndex].config,
          ...(parsed.config || {}),
        };
      } else {
        // Add new module to project
        project.modules.push({
          id: parsed.moduleId,
          enabled: true,
          config: parsed.config || {},
        });
      }

      // Update the project
      context.projectEngine.update(parsed.projectId, { modules: project.modules });

      return {
        success: true,
        message: `Module '${parsed.moduleId}' installed successfully`,
      };
    }

    case "module_uninstall": {
      const { projectId, moduleId } = args as {
        projectId: string;
        moduleId: string;
      };

      // Get the project
      const project = context.projectEngine.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Check if module is installed
      const moduleIndex = project.modules.findIndex((m) => m.id === moduleId);
      if (moduleIndex < 0) {
        throw new Error(`Module '${moduleId}' is not installed in project '${project.name}'`);
      }

      // Remove module from project
      project.modules.splice(moduleIndex, 1);

      // Uninstall from module system
      await context.moduleSystem.uninstall(projectId, moduleId);

      // Update the project
      context.projectEngine.update(projectId, { modules: project.modules });

      return {
        success: true,
        message: `Module '${moduleId}' uninstalled successfully`,
      };
    }

    // ===== TEMPLATE TOOLS =====
    case "template_list": {
      const templates = context.templateEngine.list();
      return {
        count: templates.length,
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          type: t.type,
          output: t.output,
        })),
      };
    }

    case "template_preview": {
      const parsed = TemplatePreviewSchema.parse(args);

      let project = undefined;
      if (parsed.projectId) {
        project = context.projectEngine.get(parsed.projectId);
      }

      // Create minimal context if no project
      const previewContext = project
        ? { project, data: parsed.data }
        : {
            project: {
              id: "preview",
              name: "preview_project",
              displayName: "Preview Project",
              version: "1.0.0",
              pwa: {
                name: "Preview",
                shortName: "Preview",
                description: "",
                themeColor: "#2196F3",
                backgroundColor: "#FFFFFF",
                display: "standalone" as const,
                orientation: "any" as const,
                icons: [],
                startUrl: "/",
                scope: "/",
              },
              offline: {
                strategy: "offline-first" as const,
                storage: { type: "drift" as const, encryption: false },
                caching: { assets: true, api: true, ttl: 3600 },
              },
              architecture: "feature-first" as const,
              stateManagement: "riverpod" as const,
              modules: [],
              targets: ["web" as const],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            data: parsed.data,
          };

      const preview = context.templateEngine.preview(parsed.templateId, previewContext);

      return {
        templateId: parsed.templateId,
        preview,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
