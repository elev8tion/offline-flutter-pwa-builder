/**
 * Canonical MCP tool registry.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "../core/types.js";
import { CORE_TOOLS, handleCoreToolCall } from "./core-tools.js";
import {
  DRIFT_TOOLS,
  handleDriftTool,
  type DriftToolContext,
  type DriftConfig,
} from "../modules/drift/index.js";
import {
  PWA_TOOLS,
  handlePWATool,
  type PWAToolContext,
  type PWAModuleConfig,
} from "../modules/pwa/index.js";
import {
  STATE_TOOLS,
  handleStateTool,
  type StateToolContext,
  type StateModuleConfig,
} from "../modules/state/index.js";
import {
  SECURITY_TOOLS,
  handleSecurityTool,
  type SecurityToolContext,
  type SecurityModuleConfig,
} from "../modules/security/index.js";
import {
  BUILD_TOOLS,
  handleBuildTool,
  type BuildToolContext,
  type BuildModuleConfig,
} from "../modules/build/index.js";
import {
  TESTING_TOOLS,
  handleTestingTool,
  type TestingToolContext,
  type TestingModuleConfig,
} from "../modules/testing/index.js";
import {
  PERFORMANCE_TOOLS,
  handlePerformanceTool,
  type PerformanceToolContext,
  type PerformanceModuleConfig,
} from "../modules/performance/index.js";
import {
  ACCESSIBILITY_TOOLS,
  handleAccessibilityTool,
  type AccessibilityToolContext,
  type AccessibilityModuleConfig,
} from "../modules/accessibility/index.js";
import {
  API_TOOLS,
  handleApiTool,
  type ApiToolContext,
  type ApiModuleConfig,
} from "../modules/api/index.js";
import {
  DESIGN_TOOLS,
  handleDesignTool,
  type DesignToolContext,
  type DesignModuleConfig,
} from "../modules/design/index.js";
import {
  ANALYSIS_TOOLS,
  handleAnalysisTool,
  type AnalysisToolContext,
  type AnalysisModuleConfig,
} from "../modules/analysis/index.js";
import { GITHUB_TOOLS, handleGithubTool } from "../modules/github/index.js";

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<unknown> | unknown;

const shouldThrowOnDuplicates = process.env.NODE_ENV !== "production";

function getDuplicateNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name);
    } else {
      seen.add(name);
    }
  }
  return Array.from(duplicates).sort();
}

const TOOL_ALIAS_MAP = [
  { alias: "project_create", target: "project_create_scaffold" },
  { alias: "project_build", target: "project_build_advanced" },
  { alias: "project_validate", target: "project_validate_advanced" },
];

const TOOL_ALIAS_NAMES = new Set(TOOL_ALIAS_MAP.map((entry) => entry.alias));

const FILTERED_CORE_TOOLS = CORE_TOOLS.filter((tool) => !TOOL_ALIAS_NAMES.has(tool.name));

const BASE_TOOL_DEFINITIONS: Tool[] = [
  ...FILTERED_CORE_TOOLS,
  ...DRIFT_TOOLS,
  ...PWA_TOOLS,
  ...STATE_TOOLS,
  ...SECURITY_TOOLS,
  ...BUILD_TOOLS,
  ...TESTING_TOOLS,
  ...PERFORMANCE_TOOLS,
  ...ACCESSIBILITY_TOOLS,
  ...API_TOOLS,
  ...DESIGN_TOOLS,
  ...ANALYSIS_TOOLS,
  ...GITHUB_TOOLS,
];

function getToolByName(name: string, tools: Tool[]): Tool | undefined {
  return tools.find((tool) => tool.name === name);
}

const ALIAS_TOOLS: Tool[] = TOOL_ALIAS_MAP.map(({ alias, target }) => {
  const baseTool = getToolByName(target, BASE_TOOL_DEFINITIONS);
  if (!baseTool) {
    throw new Error(`Alias target not found: ${target}`);
  }

  return {
    ...baseTool,
    name: alias,
    description: `${baseTool.description} (alias for ${target})`,
  };
});

export const TOOL_DEFINITIONS: Tool[] = [
  ...BASE_TOOL_DEFINITIONS,
  ...ALIAS_TOOLS,
];

export const TOOL_GROUPS = {
  core: FILTERED_CORE_TOOLS,
  drift: DRIFT_TOOLS,
  pwa: PWA_TOOLS,
  state: STATE_TOOLS,
  security: SECURITY_TOOLS,
  build: BUILD_TOOLS,
  testing: TESTING_TOOLS,
  performance: PERFORMANCE_TOOLS,
  accessibility: ACCESSIBILITY_TOOLS,
  api: API_TOOLS,
  design: DESIGN_TOOLS,
  analysis: ANALYSIS_TOOLS,
  github: GITHUB_TOOLS,
  aliases: ALIAS_TOOLS,
};

const definitionDuplicates = getDuplicateNames(TOOL_DEFINITIONS.map((tool) => tool.name));
if (definitionDuplicates.length > 0 && shouldThrowOnDuplicates) {
  throw new Error(`Duplicate tool names: ${definitionDuplicates.join(", ")}`);
}

function updateModuleConfig(
  context: ToolContext,
  projectId: string,
  moduleId: string,
  config: Record<string, unknown>,
  allowCreate: boolean
): void {
  const project = context.projectEngine.get(projectId);
  if (!project) return;

  const moduleIndex = project.modules.findIndex((m) => m.id === moduleId);
  if (moduleIndex >= 0) {
    const nextModules = project.modules.map((moduleConfig, index) => {
      if (index !== moduleIndex) {
        return moduleConfig;
      }
      return {
        ...moduleConfig,
        config: {
          ...(moduleConfig.config as Record<string, unknown>),
          ...config,
        },
      };
    });
    context.projectEngine.update(projectId, { modules: nextModules });
    return;
  }

  if (!allowCreate) {
    return;
  }

  const nextModules = [
    ...project.modules,
    {
      id: moduleId,
      enabled: true,
      config,
    },
  ];
  context.projectEngine.update(projectId, { modules: nextModules });
}

function registerTools(
  handlers: Map<string, ToolHandler>,
  tools: Tool[],
  handlerFactory: (toolName: string) => ToolHandler
): void {
  for (const tool of tools) {
    if (handlers.has(tool.name) && shouldThrowOnDuplicates) {
      throw new Error(`Duplicate tool handler for ${tool.name}`);
    }
    handlers.set(tool.name, handlerFactory(tool.name));
  }
}

export const TOOL_HANDLERS: Map<string, ToolHandler> = new Map();

registerTools(TOOL_HANDLERS, FILTERED_CORE_TOOLS, (toolName) => (args, context) =>
  handleCoreToolCall(toolName, args, context)
);

registerTools(TOOL_HANDLERS, DRIFT_TOOLS, (toolName) => (args, context) => {
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
      updateModuleConfig(context, projectId, "drift", config, false);
    },
  };

  return handleDriftTool(toolName, args, driftCtx);
});

registerTools(TOOL_HANDLERS, PWA_TOOLS, (toolName) => (args, context) => {
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
      updateModuleConfig(context, projectId, "pwa", config, false);
    },
  };

  return handlePWATool(toolName, args, pwaCtx);
});

registerTools(TOOL_HANDLERS, STATE_TOOLS, (toolName) => (args, context) => {
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
      updateModuleConfig(context, projectId, "state", config, true);
    },
  };

  return handleStateTool(toolName, args, stateCtx);
});

registerTools(TOOL_HANDLERS, SECURITY_TOOLS, (toolName) => (args, context) => {
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
      updateModuleConfig(context, projectId, "security", config, true);
    },
  };

  return handleSecurityTool(toolName, args, securityCtx);
});

registerTools(TOOL_HANDLERS, BUILD_TOOLS, (toolName) => (args, context) => {
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
      updateModuleConfig(
        context,
        projectId,
        "build",
        config as Record<string, unknown>,
        true
      );
    },
  };

  return handleBuildTool(toolName, args, buildCtx);
});

registerTools(TOOL_HANDLERS, TESTING_TOOLS, (toolName) => (args, context) => {
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
      updateModuleConfig(
        context,
        projectId,
        "testing",
        config as Record<string, unknown>,
        true
      );
    },
  };

  return handleTestingTool(toolName, args, testingCtx);
});

registerTools(TOOL_HANDLERS, PERFORMANCE_TOOLS, (toolName) => (args, context) => {
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
      updateModuleConfig(
        context,
        projectId,
        "performance",
        config as Record<string, unknown>,
        true
      );
    },
  };

  return handlePerformanceTool(toolName, args, performanceCtx);
});

registerTools(TOOL_HANDLERS, ACCESSIBILITY_TOOLS, (toolName) => (args, context) => {
  const accessibilityCtx: AccessibilityToolContext = {
    getProject: (id: string) => context.projectEngine.get(id),
    getAccessibilityConfig: (projectId: string) => {
      const project = context.projectEngine.get(projectId);
      if (!project) return undefined;
      const moduleConfig = project.modules.find((m) => m.id === "accessibility");
      return moduleConfig?.config as AccessibilityModuleConfig | undefined;
    },
    updateAccessibilityConfig: (projectId: string, config: Partial<AccessibilityModuleConfig>) => {
      updateModuleConfig(
        context,
        projectId,
        "accessibility",
        config as Record<string, unknown>,
        true
      );
    },
  };

  return handleAccessibilityTool(toolName, args, accessibilityCtx);
});

registerTools(TOOL_HANDLERS, API_TOOLS, (toolName) => (args, context) => {
  const apiCtx: ApiToolContext = {
    getProject: (id: string) => context.projectEngine.get(id),
    getApiConfig: (projectId: string) => {
      const project = context.projectEngine.get(projectId);
      if (!project) return undefined;
      const moduleConfig = project.modules.find((m) => m.id === "api");
      return moduleConfig?.config as ApiModuleConfig | undefined;
    },
    updateApiConfig: (projectId: string, config: Partial<ApiModuleConfig>) => {
      updateModuleConfig(context, projectId, "api", config as Record<string, unknown>, true);
    },
  };

  return handleApiTool(toolName, args, apiCtx);
});

registerTools(TOOL_HANDLERS, DESIGN_TOOLS, (toolName) => (args, context) => {
  const designCtx: DesignToolContext = {
    getProject: (id: string) => context.projectEngine.get(id),
    getDesignConfig: (projectId: string) => {
      const project = context.projectEngine.get(projectId);
      if (!project) return undefined;
      const moduleConfig = project.modules.find((m) => m.id === "design");
      return moduleConfig?.config as DesignModuleConfig | undefined;
    },
    updateDesignConfig: (projectId: string, config: Partial<DesignModuleConfig>) => {
      updateModuleConfig(
        context,
        projectId,
        "design",
        config as Record<string, unknown>,
        true
      );
    },
  };

  return handleDesignTool(toolName, args, designCtx);
});

registerTools(TOOL_HANDLERS, ANALYSIS_TOOLS, (toolName) => (args, context) => {
  const analysisCtx: AnalysisToolContext = {
    getProject: (id: string) => context.projectEngine.get(id),
    getAnalysisConfig: (projectId: string) => {
      const project = context.projectEngine.get(projectId);
      if (!project) return undefined;
      const moduleConfig = project.modules.find((m) => m.id === "analysis");
      return moduleConfig?.config as AnalysisModuleConfig | undefined;
    },
    updateAnalysisConfig: (projectId: string, config: Partial<AnalysisModuleConfig>) => {
      updateModuleConfig(
        context,
        projectId,
        "analysis",
        config as Record<string, unknown>,
        true
      );
    },
  };

  return handleAnalysisTool(toolName, args, analysisCtx);
});

registerTools(TOOL_HANDLERS, GITHUB_TOOLS, (toolName) => (args, context) =>
  handleGithubTool(toolName, args, context)
);

for (const { alias, target } of TOOL_ALIAS_MAP) {
  const targetHandler = TOOL_HANDLERS.get(target);
  if (!targetHandler) {
    throw new Error(`Alias target handler not found: ${target}`);
  }
  if (TOOL_HANDLERS.has(alias) && shouldThrowOnDuplicates) {
    throw new Error(`Duplicate tool handler for ${alias}`);
  }
  TOOL_HANDLERS.set(alias, (args, context) => targetHandler(args, context));
}

if (shouldThrowOnDuplicates) {
  const missingHandlers = TOOL_DEFINITIONS
    .map((tool) => tool.name)
    .filter((name) => !TOOL_HANDLERS.has(name));
  if (missingHandlers.length > 0) {
    throw new Error(`Missing tool handlers: ${missingHandlers.join(", ")}`);
  }
}
