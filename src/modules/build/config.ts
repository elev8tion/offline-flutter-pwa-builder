/**
 * Build Module Configuration
 *
 * Defines configuration types and schemas for build, deployment, and local development.
 * Supports multiple deployment platforms and CI/CD pipelines.
 */

import { z } from "zod";

// ============================================================================
// DEPLOYMENT PLATFORM TYPES
// ============================================================================

export type DeploymentPlatform = "vercel" | "netlify" | "firebase" | "github-pages" | "custom";
export type BuildMode = "development" | "staging" | "production";
export type WebRenderer = "html" | "canvaskit" | "auto";

export interface VercelConfig {
  projectName?: string;
  teamId?: string;
  regions?: string[];
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  redirects?: Array<{ source: string; destination: string; permanent?: boolean }>;
  rewrites?: Array<{ source: string; destination: string }>;
}

export const VercelConfigSchema = z.object({
  projectName: z.string().optional(),
  teamId: z.string().optional(),
  regions: z.array(z.string()).optional(),
  headers: z.array(z.object({
    source: z.string(),
    headers: z.array(z.object({
      key: z.string(),
      value: z.string(),
    })),
  })).optional(),
  redirects: z.array(z.object({
    source: z.string(),
    destination: z.string(),
    permanent: z.boolean().optional(),
  })).optional(),
  rewrites: z.array(z.object({
    source: z.string(),
    destination: z.string(),
  })).optional(),
});

export interface NetlifyConfig {
  siteName?: string;
  teamSlug?: string;
  buildCommand: string;
  publishDirectory: string;
  functions?: string;
  headers?: Array<{ for: string; values: Record<string, string> }>;
  redirects?: Array<{ from: string; to: string; status?: number; force?: boolean }>;
  plugins?: Array<{ package: string; inputs?: Record<string, unknown> }>;
}

export const NetlifyConfigSchema = z.object({
  siteName: z.string().optional(),
  teamSlug: z.string().optional(),
  buildCommand: z.string().default("flutter build web --release"),
  publishDirectory: z.string().default("build/web"),
  functions: z.string().optional(),
  headers: z.array(z.object({
    for: z.string(),
    values: z.record(z.string()),
  })).optional(),
  redirects: z.array(z.object({
    from: z.string(),
    to: z.string(),
    status: z.number().optional(),
    force: z.boolean().optional(),
  })).optional(),
  plugins: z.array(z.object({
    package: z.string(),
    inputs: z.record(z.unknown()).optional(),
  })).optional(),
});

export interface FirebaseConfig {
  projectId: string;
  site?: string;
  public: string;
  ignore: string[];
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  redirects?: Array<{ source: string; destination: string; type?: number }>;
  rewrites?: Array<{ source: string; destination?: string; function?: string }>;
}

export const FirebaseConfigSchema = z.object({
  projectId: z.string(),
  site: z.string().optional(),
  public: z.string().default("build/web"),
  ignore: z.array(z.string()).default(["firebase.json", "**/.*", "**/node_modules/**"]),
  headers: z.array(z.object({
    source: z.string(),
    headers: z.array(z.object({
      key: z.string(),
      value: z.string(),
    })),
  })).optional(),
  redirects: z.array(z.object({
    source: z.string(),
    destination: z.string(),
    type: z.number().optional(),
  })).optional(),
  rewrites: z.array(z.object({
    source: z.string(),
    destination: z.string().optional(),
    function: z.string().optional(),
  })).optional(),
});

export interface GitHubPagesConfig {
  branch: string;
  folder: string;
  cname?: string;
  baseHref?: string;
}

export const GitHubPagesConfigSchema = z.object({
  branch: z.string().default("gh-pages"),
  folder: z.string().default("build/web"),
  cname: z.string().optional(),
  baseHref: z.string().optional(),
});

// ============================================================================
// BUILD OPTIMIZATION TYPES
// ============================================================================

export interface OptimizationConfig {
  treeShake: boolean;
  minify: boolean;
  sourceMaps: boolean;
  splitChunks: boolean;
  lazyLoading: boolean;
  preloadAssets: boolean;
  compressAssets: boolean;
  webRenderer: WebRenderer;
  wasmSupport: boolean;
  cacheVersion: string;
}

export const OptimizationConfigSchema = z.object({
  treeShake: z.boolean().default(true),
  minify: z.boolean().default(true),
  sourceMaps: z.boolean().default(false),
  splitChunks: z.boolean().default(true),
  lazyLoading: z.boolean().default(true),
  preloadAssets: z.boolean().default(true),
  compressAssets: z.boolean().default(true),
  webRenderer: z.enum(["html", "canvaskit", "auto"]).default("auto"),
  wasmSupport: z.boolean().default(true),
  cacheVersion: z.string().default("1.0.0"),
});

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export interface EnvironmentVariable {
  name: string;
  value?: string;
  description?: string;
  required: boolean;
  secret: boolean;
}

export interface EnvironmentConfig {
  mode: BuildMode;
  variables: EnvironmentVariable[];
  envFile?: string;
  overrideFile?: string;
}

export const EnvironmentVariableSchema = z.object({
  name: z.string().min(1),
  value: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  secret: z.boolean().default(false),
});

export const EnvironmentConfigSchema = z.object({
  mode: z.enum(["development", "staging", "production"]).default("development"),
  variables: z.array(EnvironmentVariableSchema).default([]),
  envFile: z.string().optional(),
  overrideFile: z.string().optional(),
});

// ============================================================================
// LOCAL DEVELOPMENT CONFIGURATION
// ============================================================================

export interface DevServerConfig {
  port: number;
  host: string;
  https: boolean;
  hotReload: boolean;
  openBrowser: boolean;
  webRenderer: WebRenderer;
  debugMode: boolean;
}

export const DevServerConfigSchema = z.object({
  port: z.number().min(1024).max(65535).default(8080),
  host: z.string().default("localhost"),
  https: z.boolean().default(false),
  hotReload: z.boolean().default(true),
  openBrowser: z.boolean().default(true),
  webRenderer: z.enum(["html", "canvaskit", "auto"]).default("html"),
  debugMode: z.boolean().default(true),
});

export interface OfflineTestConfig {
  enabled: boolean;
  simulateLatency: number; // ms
  cacheStrategy: "cache-first" | "network-first" | "stale-while-revalidate";
  blockNetworkRequests: boolean;
}

export const OfflineTestConfigSchema = z.object({
  enabled: z.boolean().default(false),
  simulateLatency: z.number().min(0).max(10000).default(0),
  cacheStrategy: z.enum(["cache-first", "network-first", "stale-while-revalidate"]).default("cache-first"),
  blockNetworkRequests: z.boolean().default(false),
});

export interface LighthouseConfig {
  enabled: boolean;
  categories: Array<"performance" | "accessibility" | "best-practices" | "seo" | "pwa">;
  outputFormat: "html" | "json" | "csv";
  outputPath: string;
  thresholds: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    pwa?: number;
  };
}

export const LighthouseConfigSchema = z.object({
  enabled: z.boolean().default(true),
  categories: z.array(
    z.enum(["performance", "accessibility", "best-practices", "seo", "pwa"])
  ).default(["performance", "accessibility", "best-practices", "seo", "pwa"]),
  outputFormat: z.enum(["html", "json", "csv"]).default("html"),
  outputPath: z.string().default("./lighthouse-report"),
  thresholds: z.object({
    performance: z.number().min(0).max(100).optional(),
    accessibility: z.number().min(0).max(100).optional(),
    bestPractices: z.number().min(0).max(100).optional(),
    seo: z.number().min(0).max(100).optional(),
    pwa: z.number().min(0).max(100).optional(),
  }).default({}),
});

export interface LocalDevelopmentConfig {
  server: DevServerConfig;
  offlineTest: OfflineTestConfig;
  lighthouse: LighthouseConfig;
  databaseInspector: boolean;
  serviceWorkerTools: boolean;
}

export const LocalDevelopmentConfigSchema = z.object({
  server: DevServerConfigSchema,
  offlineTest: OfflineTestConfigSchema,
  lighthouse: LighthouseConfigSchema,
  databaseInspector: z.boolean().default(true),
  serviceWorkerTools: z.boolean().default(true),
});

// ============================================================================
// CI/CD CONFIGURATION
// ============================================================================

export type CIProvider = "github-actions" | "gitlab-ci" | "bitbucket" | "azure-pipelines";

export interface CIStage {
  name: string;
  commands: string[];
  environment?: Record<string, string>;
  artifacts?: string[];
  dependsOn?: string[];
}

export interface CIPipelineConfig {
  provider: CIProvider;
  triggers: {
    branches: string[];
    tags?: string[];
    pullRequest?: boolean;
  };
  stages: CIStage[];
  caching: boolean;
  notifications?: {
    slack?: string;
    email?: string[];
  };
}

export const CIStageSchema = z.object({
  name: z.string().min(1),
  commands: z.array(z.string()),
  environment: z.record(z.string()).optional(),
  artifacts: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
});

export const CIPipelineConfigSchema = z.object({
  provider: z.enum(["github-actions", "gitlab-ci", "bitbucket", "azure-pipelines"]).default("github-actions"),
  triggers: z.object({
    branches: z.array(z.string()).default(["main"]),
    tags: z.array(z.string()).optional(),
    pullRequest: z.boolean().optional(),
  }),
  stages: z.array(CIStageSchema).default([]),
  caching: z.boolean().default(true),
  notifications: z.object({
    slack: z.string().optional(),
    email: z.array(z.string().email()).optional(),
  }).optional(),
});

// ============================================================================
// RELEASE CONFIGURATION
// ============================================================================

export interface ReleaseConfig {
  versioning: "semver" | "date" | "build-number";
  autoIncrement: boolean;
  changelog: boolean;
  tagPrefix: string;
  prerelease?: string;
}

export const ReleaseConfigSchema = z.object({
  versioning: z.enum(["semver", "date", "build-number"]).default("semver"),
  autoIncrement: z.boolean().default(true),
  changelog: z.boolean().default(true),
  tagPrefix: z.string().default("v"),
  prerelease: z.string().optional(),
});

// ============================================================================
// MODULE CONFIG
// ============================================================================

export interface DeploymentConfig {
  platform: DeploymentPlatform;
  vercel?: VercelConfig;
  netlify?: NetlifyConfig;
  firebase?: FirebaseConfig;
  githubPages?: GitHubPagesConfig;
  customScript?: string;
}

export const DeploymentConfigSchema = z.object({
  platform: z.enum(["vercel", "netlify", "firebase", "github-pages", "custom"]).default("vercel"),
  vercel: VercelConfigSchema.optional(),
  netlify: NetlifyConfigSchema.optional(),
  firebase: FirebaseConfigSchema.optional(),
  githubPages: GitHubPagesConfigSchema.optional(),
  customScript: z.string().optional(),
});

export interface BuildModuleConfig {
  deployment: DeploymentConfig;
  optimization: OptimizationConfig;
  environment: EnvironmentConfig;
  localDev: LocalDevelopmentConfig;
  cicd?: CIPipelineConfig;
  release: ReleaseConfig;
}

export const BuildModuleConfigSchema = z.object({
  deployment: DeploymentConfigSchema,
  optimization: OptimizationConfigSchema,
  environment: EnvironmentConfigSchema,
  localDev: LocalDevelopmentConfigSchema,
  cicd: CIPipelineConfigSchema.optional(),
  release: ReleaseConfigSchema,
});

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_BUILD_CONFIG: BuildModuleConfig = {
  deployment: {
    platform: "vercel",
  },
  optimization: {
    treeShake: true,
    minify: true,
    sourceMaps: false,
    splitChunks: true,
    lazyLoading: true,
    preloadAssets: true,
    compressAssets: true,
    webRenderer: "auto",
    wasmSupport: true,
    cacheVersion: "1.0.0",
  },
  environment: {
    mode: "development",
    variables: [],
  },
  localDev: {
    server: {
      port: 8080,
      host: "localhost",
      https: false,
      hotReload: true,
      openBrowser: true,
      webRenderer: "html",
      debugMode: true,
    },
    offlineTest: {
      enabled: false,
      simulateLatency: 0,
      cacheStrategy: "cache-first",
      blockNetworkRequests: false,
    },
    lighthouse: {
      enabled: true,
      categories: ["performance", "accessibility", "best-practices", "seo", "pwa"],
      outputFormat: "html",
      outputPath: "./lighthouse-report",
      thresholds: {},
    },
    databaseInspector: true,
    serviceWorkerTools: true,
  },
  release: {
    versioning: "semver",
    autoIncrement: true,
    changelog: true,
    tagPrefix: "v",
  },
};

// ============================================================================
// BUILD RESULT TYPES
// ============================================================================

export interface BuildResult {
  success: boolean;
  projectId: string;
  mode: BuildMode;
  outputPath: string;
  duration: number; // ms
  size: {
    total: number; // bytes
    js: number;
    wasm: number;
    assets: number;
  };
  warnings: string[];
  errors: string[];
  artifacts: string[];
  timestamp: string;
}

export interface DeployResult {
  success: boolean;
  platform: DeploymentPlatform;
  url?: string;
  deploymentId?: string;
  duration: number;
  logs: string[];
  timestamp: string;
}

export interface AuditResult {
  success: boolean;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  };
  recommendations: string[];
  reportPath?: string;
  timestamp: string;
}

export interface ServeResult {
  success: boolean;
  url: string;
  port: number;
  pid?: number;
  logs: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get build dependencies for pubspec
 */
export function getBuildDependencies(): Record<string, string> {
  return {};
}

/**
 * Get build dev dependencies for pubspec
 */
export function getBuildDevDependencies(): Record<string, string> {
  return {
    build_runner: "^2.4.8",
    build_web_compilers: "^4.0.9",
  };
}

/**
 * Get default security headers for deployment
 */
export function getDefaultSecurityHeaders(): Array<{ key: string; value: string }> {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-XSS-Protection", value: "1; mode=block" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}

/**
 * Get PWA-specific headers
 */
export function getPWAHeaders(): Array<{ key: string; value: string }> {
  return [
    { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    { key: "Service-Worker-Allowed", value: "/" },
  ];
}

/**
 * Convert a name to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "")
    .replace(/[_\s]+/g, "-");
}

/**
 * Generate cache version based on timestamp
 */
export function generateCacheVersion(): string {
  const now = new Date();
  return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}-${now.getHours()}${now.getMinutes()}`;
}

/**
 * Calculate build size category
 */
export function getBuildSizeCategory(bytes: number): "small" | "medium" | "large" | "excessive" {
  const mb = bytes / (1024 * 1024);
  if (mb < 2) return "small";
  if (mb < 5) return "medium";
  if (mb < 10) return "large";
  return "excessive";
}

/**
 * Get flutter build command
 */
export function getFlutterBuildCommand(config: BuildModuleConfig): string {
  const parts = ["flutter", "build", "web"];

  if (config.environment.mode === "production") {
    parts.push("--release");
  } else if (config.environment.mode === "development") {
    parts.push("--profile");
  }

  if (config.optimization.webRenderer !== "auto") {
    parts.push(`--web-renderer=${config.optimization.webRenderer}`);
  }

  if (config.optimization.sourceMaps) {
    parts.push("--source-maps");
  }

  if (config.optimization.treeShake) {
    parts.push("--tree-shake-icons");
  }

  return parts.join(" ");
}

/**
 * Get flutter serve command
 */
export function getFlutterServeCommand(config: DevServerConfig): string {
  const parts = ["flutter", "run", "-d", "chrome"];

  parts.push(`--web-port=${config.port}`);

  if (config.webRenderer !== "auto") {
    parts.push(`--web-renderer=${config.webRenderer}`);
  }

  if (config.debugMode) {
    parts.push("--debug");
  }

  return parts.join(" ");
}

/**
 * Built-in CI/CD stages
 */
export const DEFAULT_CI_STAGES: CIStage[] = [
  {
    name: "install",
    commands: [
      "flutter pub get",
    ],
  },
  {
    name: "analyze",
    commands: [
      "flutter analyze",
    ],
    dependsOn: ["install"],
  },
  {
    name: "test",
    commands: [
      "flutter test",
    ],
    dependsOn: ["install"],
  },
  {
    name: "build",
    commands: [
      "flutter build web --release",
    ],
    dependsOn: ["analyze", "test"],
    artifacts: ["build/web/**"],
  },
];

/**
 * Recommended Lighthouse thresholds for PWAs
 */
export const RECOMMENDED_LIGHTHOUSE_THRESHOLDS = {
  performance: 90,
  accessibility: 100,
  bestPractices: 100,
  seo: 100,
  pwa: 100,
};

/**
 * Build optimization tips
 */
export const BUILD_OPTIMIZATION_TIPS: string[] = [
  "Use tree shaking to remove unused code",
  "Enable minification for production builds",
  "Use CanvasKit renderer for complex UIs, HTML for simpler apps",
  "Enable asset compression (gzip/brotli)",
  "Implement lazy loading for large features",
  "Use code splitting to reduce initial bundle size",
  "Preload critical assets for faster First Contentful Paint",
  "Enable WASM support for better performance",
  "Use service worker caching for offline support",
  "Monitor bundle size and set size budgets",
];
