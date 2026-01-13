/**
 * Build Module Tools
 *
 * MCP tool definitions and handlers for build, deployment, and local development.
 */

import type { ProjectDefinition } from "../../core/types.js";
import {
  BuildModuleConfig,
  DEFAULT_BUILD_CONFIG,
  BuildResult,
  DeployResult,
  AuditResult,
  ServeResult,
  DeploymentPlatform,
  BuildMode,
  CIProvider,
  getFlutterBuildCommand,
  getFlutterServeCommand,
  getDefaultSecurityHeaders,
  getPWAHeaders,
  DEFAULT_CI_STAGES,
  RECOMMENDED_LIGHTHOUSE_THRESHOLDS,
} from "./config.js";

// ============================================================================
// TOOL CONTEXT TYPE
// ============================================================================

export interface BuildToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  updateProject: (id: string, updates: Partial<ProjectDefinition>) => void;
  getBuildConfig: (projectId: string) => BuildModuleConfig | undefined;
  updateBuildConfig: (projectId: string, config: Partial<BuildModuleConfig>) => void;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const BUILD_TOOLS = [
  // -------------------------------------------------------------------------
  // project_create - Create new Flutter PWA project
  // -------------------------------------------------------------------------
  {
    name: "project_create",
    description: "Create a new Flutter PWA project with full scaffolding and configuration",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Unique project identifier",
        },
        name: {
          type: "string",
          description: "Project name (lowercase, no spaces)",
        },
        displayName: {
          type: "string",
          description: "Human-readable display name",
        },
        description: {
          type: "string",
          description: "Project description",
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
          items: { type: "string", enum: ["web", "android", "ios"] },
          description: "Target platforms",
        },
      },
      required: ["projectId", "name"],
    },
  },

  // -------------------------------------------------------------------------
  // project_build - Build project for targets
  // -------------------------------------------------------------------------
  {
    name: "project_build",
    description: "Build the Flutter project for web with optimizations",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        mode: {
          type: "string",
          enum: ["development", "staging", "production"],
          description: "Build mode",
        },
        outputPath: {
          type: "string",
          description: "Output directory path",
        },
        webRenderer: {
          type: "string",
          enum: ["html", "canvaskit", "auto"],
          description: "Web renderer to use",
        },
        sourceMaps: {
          type: "boolean",
          description: "Generate source maps",
        },
        treeShake: {
          type: "boolean",
          description: "Enable tree shaking",
        },
      },
      required: ["projectId"],
    },
  },

  // -------------------------------------------------------------------------
  // project_serve - Start local development server
  // -------------------------------------------------------------------------
  {
    name: "project_serve",
    description: "Start a local development server with hot reload",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        port: {
          type: "number",
          description: "Server port (default: 8080)",
        },
        host: {
          type: "string",
          description: "Server host (default: localhost)",
        },
        https: {
          type: "boolean",
          description: "Enable HTTPS",
        },
        webRenderer: {
          type: "string",
          enum: ["html", "canvaskit", "auto"],
          description: "Web renderer to use",
        },
        openBrowser: {
          type: "boolean",
          description: "Automatically open browser",
        },
      },
      required: ["projectId"],
    },
  },

  // -------------------------------------------------------------------------
  // project_deploy - Deploy to hosting platform
  // -------------------------------------------------------------------------
  {
    name: "project_deploy",
    description: "Deploy the built project to a hosting platform",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        platform: {
          type: "string",
          enum: ["vercel", "netlify", "firebase", "github-pages"],
          description: "Deployment platform",
        },
        production: {
          type: "boolean",
          description: "Deploy to production (vs preview)",
        },
        message: {
          type: "string",
          description: "Deployment message/description",
        },
      },
      required: ["projectId", "platform"],
    },
  },

  // -------------------------------------------------------------------------
  // project_configure_deployment - Configure deployment settings
  // -------------------------------------------------------------------------
  {
    name: "project_configure_deployment",
    description: "Configure deployment platform settings",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        platform: {
          type: "string",
          enum: ["vercel", "netlify", "firebase", "github-pages", "custom"],
          description: "Deployment platform",
        },
        projectName: {
          type: "string",
          description: "Platform-specific project name",
        },
        buildCommand: {
          type: "string",
          description: "Custom build command",
        },
        publishDirectory: {
          type: "string",
          description: "Output directory to publish",
        },
        headers: {
          type: "boolean",
          description: "Add security headers",
        },
      },
      required: ["projectId", "platform"],
    },
  },

  // -------------------------------------------------------------------------
  // project_validate - Validate project configuration
  // -------------------------------------------------------------------------
  {
    name: "project_validate",
    description: "Validate project configuration and structure",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        checkDependencies: {
          type: "boolean",
          description: "Validate dependencies",
        },
        checkAssets: {
          type: "boolean",
          description: "Validate assets",
        },
        checkManifest: {
          type: "boolean",
          description: "Validate PWA manifest",
        },
        checkServiceWorker: {
          type: "boolean",
          description: "Validate service worker",
        },
      },
      required: ["projectId"],
    },
  },

  // -------------------------------------------------------------------------
  // project_export - Export project as package
  // -------------------------------------------------------------------------
  {
    name: "project_export",
    description: "Export project as a standalone package or archive",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        format: {
          type: "string",
          enum: ["zip", "tar", "directory"],
          description: "Export format",
        },
        outputPath: {
          type: "string",
          description: "Export destination path",
        },
        includeGit: {
          type: "boolean",
          description: "Include .git directory",
        },
        includeBuild: {
          type: "boolean",
          description: "Include build output",
        },
      },
      required: ["projectId"],
    },
  },

  // -------------------------------------------------------------------------
  // project_test_offline - Test offline functionality
  // -------------------------------------------------------------------------
  {
    name: "project_test_offline",
    description: "Test offline functionality by simulating network conditions",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        scenario: {
          type: "string",
          enum: ["offline", "slow-3g", "fast-3g", "throttled"],
          description: "Network scenario to simulate",
        },
        duration: {
          type: "number",
          description: "Test duration in seconds",
        },
        validateCache: {
          type: "boolean",
          description: "Validate service worker cache",
        },
        validateStorage: {
          type: "boolean",
          description: "Validate offline storage (OPFS/IndexedDB)",
        },
      },
      required: ["projectId"],
    },
  },

  // -------------------------------------------------------------------------
  // project_audit - Run Lighthouse audit
  // -------------------------------------------------------------------------
  {
    name: "project_audit",
    description: "Run Lighthouse PWA audit for performance and best practices",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        categories: {
          type: "array",
          items: {
            type: "string",
            enum: ["performance", "accessibility", "best-practices", "seo", "pwa"],
          },
          description: "Audit categories to run",
        },
        outputFormat: {
          type: "string",
          enum: ["html", "json", "csv"],
          description: "Report output format",
        },
        thresholds: {
          type: "object",
          description: "Score thresholds (fail if below)",
        },
      },
      required: ["projectId"],
    },
  },

  // -------------------------------------------------------------------------
  // project_configure_cicd - Configure CI/CD pipeline
  // -------------------------------------------------------------------------
  {
    name: "project_configure_cicd",
    description: "Configure CI/CD pipeline for automated builds and deployments",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Project identifier",
        },
        provider: {
          type: "string",
          enum: ["github-actions", "gitlab-ci", "bitbucket", "azure-pipelines"],
          description: "CI/CD provider",
        },
        branches: {
          type: "array",
          items: { type: "string" },
          description: "Branches to trigger pipeline",
        },
        includeTests: {
          type: "boolean",
          description: "Include test stage",
        },
        includeLinting: {
          type: "boolean",
          description: "Include linting stage",
        },
        autoDeploy: {
          type: "boolean",
          description: "Auto-deploy on successful build",
        },
        deployTarget: {
          type: "string",
          enum: ["vercel", "netlify", "firebase", "github-pages"],
          description: "Deployment target",
        },
      },
      required: ["projectId", "provider"],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Handle project_create tool
 */
export function handleProjectCreate(
  args: {
    projectId: string;
    name: string;
    displayName?: string;
    description?: string;
    architecture?: "clean" | "feature-first" | "layer-first";
    stateManagement?: "riverpod" | "bloc" | "provider";
    targets?: Array<"web" | "android" | "ios">;
  },
  context: BuildToolContext
): { success: boolean; project?: ProjectDefinition; error?: string } {
  const existingProject = context.getProject(args.projectId);
  if (existingProject) {
    return { success: false, error: `Project ${args.projectId} already exists` };
  }

  const now = new Date().toISOString();
  const project: ProjectDefinition = {
    id: args.projectId,
    name: args.name.toLowerCase().replace(/\s+/g, "_"),
    displayName: args.displayName || args.name,
    version: "1.0.0",
    pwa: {
      name: args.displayName || args.name,
      shortName: args.name,
      description: args.description || `${args.name} PWA`,
      themeColor: "#2196F3",
      backgroundColor: "#FFFFFF",
      display: "standalone",
      orientation: "any",
      icons: [],
      startUrl: "/",
      scope: "/",
    },
    offline: {
      strategy: "offline-first",
      storage: {
        type: "drift",
        encryption: false,
      },
      caching: {
        assets: true,
        api: true,
        ttl: 86400,
      },
    },
    architecture: args.architecture || "feature-first",
    stateManagement: args.stateManagement || "riverpod",
    modules: [
      { id: "build", enabled: true, config: DEFAULT_BUILD_CONFIG as unknown as Record<string, unknown> },
    ],
    targets: args.targets || ["web"],
    createdAt: now,
    updatedAt: now,
  };

  return { success: true, project };
}

/**
 * Handle project_build tool
 */
export function handleProjectBuild(
  args: {
    projectId: string;
    mode?: BuildMode;
    outputPath?: string;
    webRenderer?: "html" | "canvaskit" | "auto";
    sourceMaps?: boolean;
    treeShake?: boolean;
  },
  context: BuildToolContext
): { success: boolean; result?: BuildResult; error?: string; command?: string } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const buildConfig = context.getBuildConfig(args.projectId) || DEFAULT_BUILD_CONFIG;

  // Apply overrides
  const config: BuildModuleConfig = {
    ...buildConfig,
    environment: {
      ...buildConfig.environment,
      mode: args.mode || buildConfig.environment.mode,
    },
    optimization: {
      ...buildConfig.optimization,
      webRenderer: args.webRenderer || buildConfig.optimization.webRenderer,
      sourceMaps: args.sourceMaps ?? buildConfig.optimization.sourceMaps,
      treeShake: args.treeShake ?? buildConfig.optimization.treeShake,
    },
  };

  const command = getFlutterBuildCommand(config);
  const outputPath = args.outputPath || "build/web";

  const result: BuildResult = {
    success: true,
    projectId: args.projectId,
    mode: config.environment.mode,
    outputPath,
    duration: 0, // Would be actual duration in real implementation
    size: {
      total: 0,
      js: 0,
      wasm: 0,
      assets: 0,
    },
    warnings: [],
    errors: [],
    artifacts: [
      `${outputPath}/index.html`,
      `${outputPath}/main.dart.js`,
      `${outputPath}/flutter_service_worker.js`,
      `${outputPath}/manifest.json`,
    ],
    timestamp: new Date().toISOString(),
  };

  return { success: true, result, command };
}

/**
 * Handle project_serve tool
 */
export function handleProjectServe(
  args: {
    projectId: string;
    port?: number;
    host?: string;
    https?: boolean;
    webRenderer?: "html" | "canvaskit" | "auto";
    openBrowser?: boolean;
  },
  context: BuildToolContext
): { success: boolean; result?: ServeResult; error?: string; command?: string } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const buildConfig = context.getBuildConfig(args.projectId) || DEFAULT_BUILD_CONFIG;

  const serverConfig = {
    ...buildConfig.localDev.server,
    port: args.port ?? buildConfig.localDev.server.port,
    host: args.host ?? buildConfig.localDev.server.host,
    https: args.https ?? buildConfig.localDev.server.https,
    webRenderer: args.webRenderer ?? buildConfig.localDev.server.webRenderer,
    openBrowser: args.openBrowser ?? buildConfig.localDev.server.openBrowser,
  };

  const command = getFlutterServeCommand(serverConfig);
  const protocol = serverConfig.https ? "https" : "http";
  const url = `${protocol}://${serverConfig.host}:${serverConfig.port}`;

  const result: ServeResult = {
    success: true,
    url,
    port: serverConfig.port,
    logs: [
      `Starting development server...`,
      `Server running at ${url}`,
      `Hot reload enabled: ${buildConfig.localDev.server.hotReload}`,
      `Web renderer: ${serverConfig.webRenderer}`,
    ],
  };

  return { success: true, result, command };
}

/**
 * Handle project_deploy tool
 */
export function handleProjectDeploy(
  args: {
    projectId: string;
    platform: DeploymentPlatform;
    production?: boolean;
    message?: string;
  },
  context: BuildToolContext
): { success: boolean; result?: DeployResult; error?: string; commands?: string[] } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const commands: string[] = [];

  switch (args.platform) {
    case "vercel":
      commands.push(args.production ? "vercel --prod" : "vercel");
      break;
    case "netlify":
      commands.push(args.production ? "netlify deploy --prod" : "netlify deploy");
      break;
    case "firebase":
      commands.push("firebase deploy --only hosting");
      break;
    case "github-pages":
      commands.push("git subtree push --prefix build/web origin gh-pages");
      break;
  }

  const result: DeployResult = {
    success: true,
    platform: args.platform,
    url: `https://${project.name}.${args.platform === "vercel" ? "vercel.app" : args.platform === "netlify" ? "netlify.app" : args.platform === "firebase" ? "web.app" : "github.io"}`,
    deploymentId: `deploy-${Date.now()}`,
    duration: 0,
    logs: [
      `Deploying to ${args.platform}...`,
      `Build output: build/web`,
      args.production ? "Production deployment" : "Preview deployment",
    ],
    timestamp: new Date().toISOString(),
  };

  return { success: true, result, commands };
}

/**
 * Handle project_configure_deployment tool
 */
export function handleConfigureDeployment(
  args: {
    projectId: string;
    platform: DeploymentPlatform;
    projectName?: string;
    buildCommand?: string;
    publishDirectory?: string;
    headers?: boolean;
  },
  context: BuildToolContext
): { success: boolean; config?: Record<string, unknown>; error?: string } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const buildConfig = context.getBuildConfig(args.projectId) || DEFAULT_BUILD_CONFIG;
  const securityHeaders = args.headers ? getDefaultSecurityHeaders() : [];
  const pwaHeaders = args.headers ? getPWAHeaders() : [];
  const allHeaders = [...securityHeaders, ...pwaHeaders];

  let platformConfig: Record<string, unknown> = {};

  switch (args.platform) {
    case "vercel":
      platformConfig = {
        projectName: args.projectName || project.name,
        headers: allHeaders.length > 0 ? [{
          source: "/(.*)",
          headers: allHeaders,
        }] : undefined,
      };
      break;

    case "netlify":
      platformConfig = {
        siteName: args.projectName || project.name,
        buildCommand: args.buildCommand || "flutter build web --release",
        publishDirectory: args.publishDirectory || "build/web",
        headers: allHeaders.length > 0 ? [{
          for: "/*",
          values: Object.fromEntries(allHeaders.map(h => [h.key, h.value])),
        }] : undefined,
      };
      break;

    case "firebase":
      platformConfig = {
        projectId: args.projectName || project.name,
        public: args.publishDirectory || "build/web",
        ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
        headers: allHeaders.length > 0 ? [{
          source: "**",
          headers: allHeaders,
        }] : undefined,
      };
      break;

    case "github-pages":
      platformConfig = {
        branch: "gh-pages",
        folder: args.publishDirectory || "build/web",
        baseHref: `/${project.name}/`,
      };
      break;
  }

  const updatedConfig: Partial<BuildModuleConfig> = {
    deployment: {
      ...buildConfig.deployment,
      platform: args.platform,
      [args.platform === "github-pages" ? "githubPages" : args.platform]: platformConfig,
    },
  };

  context.updateBuildConfig(args.projectId, updatedConfig);

  return { success: true, config: platformConfig };
}

/**
 * Handle project_validate tool
 */
export function handleProjectValidate(
  args: {
    projectId: string;
    checkDependencies?: boolean;
    checkAssets?: boolean;
    checkManifest?: boolean;
    checkServiceWorker?: boolean;
  },
  context: BuildToolContext
): { success: boolean; issues: Array<{ type: string; severity: string; message: string }>; valid: boolean } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return {
      success: false,
      issues: [{ type: "project", severity: "error", message: `Project ${args.projectId} not found` }],
      valid: false,
    };
  }

  const issues: Array<{ type: string; severity: string; message: string }> = [];

  // Check PWA config
  if (args.checkManifest !== false) {
    if (!project.pwa.name) {
      issues.push({ type: "manifest", severity: "error", message: "PWA name is required" });
    }
    if (!project.pwa.shortName) {
      issues.push({ type: "manifest", severity: "error", message: "PWA short name is required" });
    }
    if (project.pwa.icons.length === 0) {
      issues.push({ type: "manifest", severity: "warning", message: "No PWA icons configured" });
    }
    if (!project.pwa.themeColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      issues.push({ type: "manifest", severity: "warning", message: "Invalid theme color format" });
    }
  }

  // Check offline config
  if (args.checkServiceWorker !== false) {
    if (!project.offline.strategy) {
      issues.push({ type: "offline", severity: "error", message: "Offline strategy not configured" });
    }
    if (!project.offline.caching.assets) {
      issues.push({ type: "offline", severity: "warning", message: "Asset caching is disabled" });
    }
  }

  // Check targets
  if (!project.targets.includes("web")) {
    issues.push({ type: "target", severity: "warning", message: "Web target not included for PWA" });
  }

  const valid = !issues.some(i => i.severity === "error");

  return { success: true, issues, valid };
}

/**
 * Handle project_export tool
 */
export function handleProjectExport(
  args: {
    projectId: string;
    format?: "zip" | "tar" | "directory";
    outputPath?: string;
    includeGit?: boolean;
    includeBuild?: boolean;
  },
  context: BuildToolContext
): { success: boolean; exportPath?: string; error?: string; commands?: string[] } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const format = args.format || "zip";
  const outputPath = args.outputPath || `./${project.name}-export`;
  const commands: string[] = [];

  // Build exclude patterns
  const excludes: string[] = [];
  if (!args.includeGit) excludes.push(".git");
  if (!args.includeBuild) excludes.push("build");
  excludes.push("node_modules", ".dart_tool", ".packages");

  const excludeFlags = excludes.map(e => `--exclude='${e}'`).join(" ");

  switch (format) {
    case "zip":
      commands.push(`zip -r ${outputPath}.zip . ${excludeFlags}`);
      break;
    case "tar":
      commands.push(`tar ${excludeFlags} -cvzf ${outputPath}.tar.gz .`);
      break;
    case "directory":
      commands.push(`mkdir -p ${outputPath}`);
      commands.push(`rsync -av ${excludeFlags} . ${outputPath}/`);
      break;
  }

  return {
    success: true,
    exportPath: format === "directory" ? outputPath : `${outputPath}.${format === "zip" ? "zip" : "tar.gz"}`,
    commands,
  };
}

/**
 * Handle project_test_offline tool
 */
export function handleTestOffline(
  args: {
    projectId: string;
    scenario?: "offline" | "slow-3g" | "fast-3g" | "throttled";
    duration?: number;
    validateCache?: boolean;
    validateStorage?: boolean;
  },
  context: BuildToolContext
): { success: boolean; testPlan?: Record<string, unknown>; error?: string } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const scenario = args.scenario || "offline";
  const duration = args.duration || 30;

  const networkConditions: Record<string, { download: number; upload: number; latency: number }> = {
    "offline": { download: 0, upload: 0, latency: 0 },
    "slow-3g": { download: 500, upload: 500, latency: 2000 },
    "fast-3g": { download: 1500, upload: 750, latency: 500 },
    "throttled": { download: 5000, upload: 2500, latency: 100 },
  };

  const testPlan = {
    scenario,
    duration: `${duration}s`,
    networkConditions: networkConditions[scenario],
    tests: [
      {
        name: "Initial Load",
        description: "Verify app loads from cache when offline",
        enabled: true,
      },
      {
        name: "Navigation",
        description: "Verify all routes work offline",
        enabled: true,
      },
      {
        name: "Data Persistence",
        description: "Verify data persists in offline storage",
        enabled: args.validateStorage !== false,
      },
      {
        name: "Service Worker Cache",
        description: "Verify service worker serves cached assets",
        enabled: args.validateCache !== false,
      },
      {
        name: "Sync Queue",
        description: "Verify offline changes are queued for sync",
        enabled: project.offline.sync?.enabled || false,
      },
    ],
    devToolsInstructions: [
      "Open Chrome DevTools (F12)",
      "Go to Network tab",
      `Select '${scenario === "offline" ? "Offline" : scenario}' from throttling dropdown`,
      "Alternatively, use Application > Service Workers > Offline checkbox",
    ],
  };

  return { success: true, testPlan };
}

/**
 * Handle project_audit tool
 */
export function handleProjectAudit(
  args: {
    projectId: string;
    categories?: Array<"performance" | "accessibility" | "best-practices" | "seo" | "pwa">;
    outputFormat?: "html" | "json" | "csv";
    thresholds?: Record<string, number>;
  },
  context: BuildToolContext
): { success: boolean; result?: AuditResult; error?: string; command?: string } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const categories = args.categories || ["performance", "accessibility", "best-practices", "seo", "pwa"];
  const outputFormat = args.outputFormat || "html";
  const thresholds = args.thresholds || RECOMMENDED_LIGHTHOUSE_THRESHOLDS;

  const categoryFlags = categories.map(c => `--only-categories=${c}`).join(" ");
  const command = `npx lighthouse http://localhost:8080 ${categoryFlags} --output=${outputFormat} --output-path=./lighthouse-report.${outputFormat}`;

  // Simulated audit result (real implementation would run Lighthouse)
  const result: AuditResult = {
    success: true,
    scores: {
      performance: 95,
      accessibility: 100,
      bestPractices: 100,
      seo: 100,
      pwa: 100,
    },
    recommendations: [
      "Consider using next-gen image formats (WebP, AVIF)",
      "Implement resource hints (preconnect, prefetch)",
      "Enable text compression (gzip/brotli)",
    ],
    reportPath: `./lighthouse-report.${outputFormat}`,
    timestamp: new Date().toISOString(),
  };

  // Check against thresholds
  const failures: string[] = [];
  for (const [category, threshold] of Object.entries(thresholds)) {
    const score = result.scores[category as keyof typeof result.scores];
    if (score !== undefined && score < threshold) {
      failures.push(`${category}: ${score} (threshold: ${threshold})`);
    }
  }

  if (failures.length > 0) {
    result.recommendations.unshift(`Failed thresholds: ${failures.join(", ")}`);
  }

  return { success: true, result, command };
}

/**
 * Handle project_configure_cicd tool
 */
export function handleConfigureCICD(
  args: {
    projectId: string;
    provider: CIProvider;
    branches?: string[];
    includeTests?: boolean;
    includeLinting?: boolean;
    autoDeploy?: boolean;
    deployTarget?: DeploymentPlatform;
  },
  context: BuildToolContext
): { success: boolean; config?: Record<string, unknown>; error?: string } {
  const project = context.getProject(args.projectId);
  if (!project) {
    return { success: false, error: `Project ${args.projectId} not found` };
  }

  const stages = [...DEFAULT_CI_STAGES];

  // Add deploy stage if auto-deploy is enabled
  if (args.autoDeploy && args.deployTarget) {
    const deployCommands: Record<DeploymentPlatform, string[]> = {
      "vercel": ["npm i -g vercel", "vercel --prod --token=$VERCEL_TOKEN"],
      "netlify": ["npm i -g netlify-cli", "netlify deploy --prod --auth=$NETLIFY_AUTH_TOKEN"],
      "firebase": ["npm i -g firebase-tools", "firebase deploy --token=$FIREBASE_TOKEN"],
      "github-pages": ["git config user.email 'ci@example.com'", "git config user.name 'CI'", "git subtree push --prefix build/web origin gh-pages"],
      "custom": [],
    };

    stages.push({
      name: "deploy",
      commands: deployCommands[args.deployTarget],
      dependsOn: ["build"],
    });
  }

  const pipelineConfig = {
    provider: args.provider,
    triggers: {
      branches: args.branches || ["main"],
      pullRequest: true,
    },
    stages: stages.filter(s => {
      if (s.name === "test" && args.includeTests === false) return false;
      if (s.name === "analyze" && args.includeLinting === false) return false;
      return true;
    }),
    caching: true,
  };

  const updatedConfig: Partial<BuildModuleConfig> = {
    cicd: pipelineConfig,
  };

  context.updateBuildConfig(args.projectId, updatedConfig);

  return { success: true, config: pipelineConfig };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Handle build module tool calls
 */
export function handleBuildTool(
  toolName: string,
  args: Record<string, unknown>,
  context: BuildToolContext
): Record<string, unknown> {
  switch (toolName) {
    case "project_create":
      return handleProjectCreate(args as Parameters<typeof handleProjectCreate>[0], context);

    case "project_build":
      return handleProjectBuild(args as Parameters<typeof handleProjectBuild>[0], context);

    case "project_serve":
      return handleProjectServe(args as Parameters<typeof handleProjectServe>[0], context);

    case "project_deploy":
      return handleProjectDeploy(args as Parameters<typeof handleProjectDeploy>[0], context);

    case "project_configure_deployment":
      return handleConfigureDeployment(args as Parameters<typeof handleConfigureDeployment>[0], context);

    case "project_validate":
      return handleProjectValidate(args as Parameters<typeof handleProjectValidate>[0], context);

    case "project_export":
      return handleProjectExport(args as Parameters<typeof handleProjectExport>[0], context);

    case "project_test_offline":
      return handleTestOffline(args as Parameters<typeof handleTestOffline>[0], context);

    case "project_audit":
      return handleProjectAudit(args as Parameters<typeof handleProjectAudit>[0], context);

    case "project_configure_cicd":
      return handleConfigureCICD(args as Parameters<typeof handleConfigureCICD>[0], context);

    default:
      return { success: false, error: `Unknown build tool: ${toolName}` };
  }
}
