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

// Phase 7: Testing Module
import { TESTING_TOOLS, handleTestingTool, type TestingToolContext, type TestingModuleConfig } from "../modules/testing/index.js";

// Phase 8: Performance Module
import { PERFORMANCE_TOOLS, handlePerformanceTool, type PerformanceToolContext, type PerformanceModuleConfig } from "../modules/performance/index.js";

// Phase 9: Accessibility Module
import { ACCESSIBILITY_TOOLS, handleAccessibilityTool, type AccessibilityToolContext, type AccessibilityModuleConfig } from "../modules/accessibility/index.js";

// Phase 10: API Module
import { API_TOOLS, handleApiTool, type ApiToolContext, type ApiModuleConfig } from "../modules/api/index.js";

// Phase 11: Design Module
import { DESIGN_TOOLS, handleDesignTool, type DesignToolContext, type DesignModuleConfig } from "../modules/design/index.js";

// Phase 12: Analysis Module
import { ANALYSIS_TOOLS, handleAnalysisTool, type AnalysisToolContext, type AnalysisModuleConfig } from "../modules/analysis/index.js";

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
      name: "project_export_files",
      description: "Write generated files to disk without running full build pipeline",
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
            items: {
              type: "string",
            },
            description: "Specific files to export (all if omitted)",
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

    // ===== PHASE 7: TESTING TOOLS =====
    ...TESTING_TOOLS,

    // ===== PHASE 8: PERFORMANCE TOOLS =====
    ...PERFORMANCE_TOOLS,

    // ===== PHASE 9: ACCESSIBILITY TOOLS =====
    ...ACCESSIBILITY_TOOLS,

    // ===== PHASE 10: API TOOLS =====
    ...API_TOOLS,

    // ===== PHASE 11: DESIGN TOOLS =====
    ...DESIGN_TOOLS,

    // ===== PHASE 12: ANALYSIS TOOLS =====
    ...ANALYSIS_TOOLS,
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
        transaction.rollback();
        throw error;
      }

      return {
        success: true,
        exported: filesToExport.length,
        outputPath: parsed.outputPath,
        files: filesToExport.map((f) => f.path),
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
    case "drift_run_codegen":
    // Tier 1: Critical Offline Features
    case "drift_configure_conflict_resolution":
    case "drift_configure_background_sync":
    case "drift_configure_offline_indicator":
    case "drift_configure_optimistic_updates":
    case "drift_configure_retry_policy":
    // Tier 2: Performance & Scalability
    case "drift_configure_pagination":
    case "drift_configure_lazy_loading":
    case "drift_configure_query_cache":
    case "drift_configure_batch_operations":
    case "drift_configure_data_compression": {
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

    // ===== PHASE 7: TESTING TOOLS =====
    case "testing_generate_unit":
    case "testing_generate_widget":
    case "testing_generate_integration":
    case "testing_generate_mocks":
    case "testing_configure_coverage":
    case "testing_run_with_coverage": {
      // Create testing tool context
      const testingCtx: TestingToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        updateProject: async (id: string, updates) => context.projectEngine.update(id, updates),
        getTestingConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "testing");
          return moduleConfig?.config as TestingModuleConfig | undefined;
        },
        updateTestingConfig: (projectId: string, config: Partial<TestingModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "testing");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create testing module if not exists
            project.modules.push({
              id: "testing",
              enabled: true,
              config: config as unknown as Record<string, unknown>,
            });
          }
        },
      };

      return handleTestingTool(name, args, testingCtx);
    }

    // ===== PHASE 8: PERFORMANCE TOOLS =====
    case "performance_analyze":
    case "performance_check_memory_leaks":
    case "performance_analyze_build_size":
    case "performance_optimize_assets":
    case "performance_generate_report":
    case "performance_configure_thresholds": {
      // Create performance tool context
      const performanceCtx: PerformanceToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        updateProject: async (id: string, updates) => context.projectEngine.update(id, updates),
        getPerformanceConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "performance");
          return moduleConfig?.config as PerformanceModuleConfig | undefined;
        },
        updatePerformanceConfig: (projectId: string, config: Partial<PerformanceModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "performance");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create performance module if not exists
            project.modules.push({
              id: "performance",
              enabled: true,
              config: config as unknown as Record<string, unknown>,
            });
          }
        },
      };

      return handlePerformanceTool(name, args, performanceCtx);
    }

    // ===== PHASE 9: ACCESSIBILITY TOOLS =====
    case "accessibility_audit_wcag":
    case "accessibility_generate_fixes":
    case "accessibility_setup_i18n":
    case "accessibility_generate_translations": {
      // Create accessibility tool context
      const accessibilityCtx: AccessibilityToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        getAccessibilityConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "accessibility");
          return moduleConfig?.config as AccessibilityModuleConfig | undefined;
        },
        updateAccessibilityConfig: (projectId: string, config: Partial<AccessibilityModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "accessibility");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create accessibility module if not exists
            project.modules.push({
              id: "accessibility",
              enabled: true,
              config: config as unknown as Record<string, unknown>,
            });
          }
        },
      };

      return handleAccessibilityTool(name, args, accessibilityCtx);
    }

    // ===== PHASE 10: API TOOLS =====
    case "api_generate_client":
    case "api_create_mock_server":
    case "api_generate_json_model": {
      // Create API tool context
      const apiCtx: ApiToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        getApiConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "api");
          return moduleConfig?.config as ApiModuleConfig | undefined;
        },
        updateApiConfig: (projectId: string, config: Partial<ApiModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "api");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create API module if not exists
            project.modules.push({
              id: "api",
              enabled: true,
              config: config as unknown as Record<string, unknown>,
            });
          }
        },
      };

      return handleApiTool(name, args, apiCtx);
    }

    // ===== PHASE 11: DESIGN TOOLS =====
    case "design_generate_theme":
    case "design_create_animation":
    case "design_generate_tokens":
    case "design_generate_edc_tokens":
    case "design_generate_gradients":
    case "design_generate_wcag":
    case "design_generate_glass_card":
    case "design_generate_glass_button":
    case "design_generate_glass_bottomsheet":
    case "design_generate_shadows":
    case "design_generate_text_shadows":
    case "design_generate_noise_overlay":
    case "design_generate_light_simulation": {
      // Create Design tool context
      const designCtx: DesignToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        getDesignConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "design");
          return moduleConfig?.config as DesignModuleConfig | undefined;
        },
        updateDesignConfig: (projectId: string, config: Partial<DesignModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "design");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create Design module if not exists
            project.modules.push({
              id: "design",
              enabled: true,
              config: config as unknown as Record<string, unknown>,
            });
          }
        },
      };

      return handleDesignTool(name, args, designCtx);
    }

    // ===== PHASE 12: ANALYSIS TOOLS =====
    case "analysis_analyze_project":
    case "analysis_audit_dependencies":
    case "analysis_detect_architecture":
    case "analysis_generate_report": {
      // Create Analysis tool context
      const analysisCtx: AnalysisToolContext = {
        getProject: (id: string) => context.projectEngine.get(id),
        getAnalysisConfig: (projectId: string) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return undefined;
          const moduleConfig = project.modules.find((m) => m.id === "analysis");
          return moduleConfig?.config as AnalysisModuleConfig | undefined;
        },
        updateAnalysisConfig: (projectId: string, config: Partial<AnalysisModuleConfig>) => {
          const project = context.projectEngine.get(projectId);
          if (!project) return;
          const moduleIndex = project.modules.findIndex((m) => m.id === "analysis");
          if (moduleIndex >= 0) {
            project.modules[moduleIndex].config = {
              ...project.modules[moduleIndex].config,
              ...config,
            };
          } else {
            // Create Analysis module if not exists
            project.modules.push({
              id: "analysis",
              enabled: true,
              config: config as unknown as Record<string, unknown>,
            });
          }
        },
      };

      return handleAnalysisTool(name, args, analysisCtx);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
