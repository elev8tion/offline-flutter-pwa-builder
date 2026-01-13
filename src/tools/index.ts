/**
 * MCP Tools
 *
 * Defines all available MCP tools and their handlers.
 * Organized by module/phase as per the blueprint.
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "../core/types.js";
import { formatValidationResult } from "../core/validation-framework/index.js";

// Phase 2: Drift Module
import { DRIFT_TOOLS, handleDriftTool, type DriftToolContext, type DriftConfig } from "../modules/drift/index.js";

// Phase 3: PWA Module
import { PWA_TOOLS, handlePWATool, type PWAToolContext, type PWAModuleConfig } from "../modules/pwa/index.js";

// Phase 4: State Module
import { STATE_TOOLS, handleStateTool, type StateToolContext, type StateModuleConfig } from "../modules/state/index.js";

// Phase 5: Security Module
import { SECURITY_TOOLS, handleSecurityTool, type SecurityToolContext, type SecurityModuleConfig } from "../modules/security/index.js";

// Phase 6: Build Module
import { BUILD_TOOLS, handleBuildTool, type BuildToolContext, type BuildModuleConfig } from "../modules/build/index.js";

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

export function getTools(): Tool[] {
  return [
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
      name: "project_build",
      description: "Build project and output to a directory",
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
      description: "Validate project configuration",
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

    // ===== PHASE 2: DRIFT TOOLS =====
    ...DRIFT_TOOLS,

    // ===== PHASE 3: PWA TOOLS =====
    ...PWA_TOOLS,

    // ===== PHASE 4: STATE TOOLS =====
    ...STATE_TOOLS,

    // ===== PHASE 5: SECURITY TOOLS =====
    ...SECURITY_TOOLS,

    // ===== PHASE 6: BUILD TOOLS =====
    ...BUILD_TOOLS,
  ];
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handleToolCall(
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

    // ===== PHASE 2: DRIFT TOOLS =====
    case "drift_add_table":
    case "drift_add_relation":
    case "drift_generate_dao":
    case "drift_create_migration":
    case "drift_enable_encryption":
    case "drift_run_codegen": {
      // Create drift tool context
      const driftCtx: DriftToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        updateProject: (id: string, updates) => context.projectEngine.update(id, updates),
        getDriftConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "drift");
          return moduleConfig?.config as DriftConfig | undefined;
        },
        updateDriftConfig: (projectId: string, config: Partial<DriftConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "drift");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          }
        },
      };

      return handleDriftTool(name, args, driftCtx);
    }

    // ===== PHASE 3: PWA TOOLS =====
    case "pwa_configure_manifest":
    case "pwa_generate_icons":
    case "pwa_configure_caching":
    case "pwa_add_shortcut":
    case "pwa_configure_install_prompt":
    case "pwa_generate_manifest": {
      // Create PWA tool context
      const pwaCtx: PWAToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        updateProject: (id: string, updates) => context.projectEngine.update(id, updates),
        getPWAConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "pwa");
          return moduleConfig?.config as PWAModuleConfig | undefined;
        },
        updatePWAConfig: (projectId: string, config: Partial<PWAModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "pwa");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          }
        },
      };

      return handlePWATool(name, args, pwaCtx);
    }

    // ===== PHASE 4: STATE TOOLS =====
    case "state_create_provider":
    case "state_create_bloc":
    case "state_generate_feature":
    case "state_configure_offline_sync": {
      // Create state tool context
      const stateCtx: StateToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        updateProject: (id: string, updates) => context.projectEngine.update(id, updates),
        getStateConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "state");
          return moduleConfig?.config as StateModuleConfig | undefined;
        },
        updateStateConfig: (projectId: string, config: Partial<StateModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "state");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create state module if not exists
            project.modules.push({
              id: "state",
              enabled: true,
              config: config,
            });
          }
        },
      };

      return handleStateTool(name, args, stateCtx);
    }

    // ===== PHASE 5: SECURITY TOOLS =====
    case "security_enable_encryption":
    case "security_add_validation":
    case "security_audit":
    case "security_classify_data": {
      // Create security tool context
      const securityCtx: SecurityToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        updateProject: (id: string, updates) => context.projectEngine.update(id, updates),
        getSecurityConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "security");
          return moduleConfig?.config as SecurityModuleConfig | undefined;
        },
        updateSecurityConfig: (projectId: string, config: Partial<SecurityModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "security");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create security module if not exists
            project.modules.push({
              id: "security",
              enabled: true,
              config: config,
            });
          }
        },
      };

      return handleSecurityTool(name, args, securityCtx);
    }

    // ===== PHASE 6: BUILD TOOLS =====
    case "project_create":
    case "project_build":
    case "project_serve":
    case "project_deploy":
    case "project_configure_deployment":
    case "project_validate":
    case "project_export":
    case "project_test_offline":
    case "project_audit":
    case "project_configure_cicd": {
      // Check if it's a build module tool (has platform or mode parameter)
      // Core tools use project_create/project_build differently
      const isBuildModuleTool =
        name === "project_serve" ||
        name === "project_deploy" ||
        name === "project_configure_deployment" ||
        name === "project_export" ||
        name === "project_test_offline" ||
        name === "project_audit" ||
        name === "project_configure_cicd" ||
        (name === "project_build" && (args.mode || args.webRenderer)) ||
        (name === "project_validate" && (args.checkDependencies !== undefined || args.checkAssets !== undefined));

      if (!isBuildModuleTool) {
        // Fall through to default for core tools
        throw new Error(`Unknown tool: ${name}`);
      }

      // Create build tool context
      const buildCtx: BuildToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        updateProject: (id: string, updates) => context.projectEngine.update(id, updates),
        getBuildConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "build");
          return moduleConfig?.config as BuildModuleConfig | undefined;
        },
        updateBuildConfig: (projectId: string, config: Partial<BuildModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "build");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create build module if not exists
            project.modules.push({
              id: "build",
              enabled: true,
              config: config as unknown as Record<string, unknown>,
            });
          }
        },
      };

      return handleBuildTool(name, args, buildCtx);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
