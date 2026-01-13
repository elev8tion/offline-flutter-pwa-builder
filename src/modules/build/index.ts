/**
 * Build Module
 *
 * Provides build, deployment, and local development capabilities for Flutter PWAs.
 * Supports multiple deployment platforms and CI/CD pipelines.
 *
 * Features:
 * - Multi-platform deployment (Vercel, Netlify, Firebase, GitHub Pages)
 * - Build optimization (tree shaking, minification, compression)
 * - Local development server with hot reload
 * - Offline testing tools
 * - Lighthouse PWA audits
 * - CI/CD pipeline generation (GitHub Actions, GitLab CI)
 * - Environment configuration management
 */

import type { Module } from "../../core/types.js";
import { BuildModuleConfig, DEFAULT_BUILD_CONFIG, BuildModuleConfigSchema } from "./config.js";
import { buildHooks } from "./hooks.js";
import { BUILD_TOOLS, handleBuildTool, type BuildToolContext } from "./tools.js";
import { BUILD_TEMPLATES } from "./templates.js";

// Re-export types and utilities
export * from "./config.js";
export { buildHooks, handleBuildTool, BUILD_TOOLS, BUILD_TEMPLATES };
export type { BuildToolContext };

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const BUILD_MODULE: Module = {
  id: "build",
  name: "Build & Deploy",
  version: "1.0.0",
  description: "Build optimization, deployment, and local development tools for Flutter PWAs",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: BuildModuleConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_BUILD_CONFIG as unknown as Record<string, unknown>,
  templates: BUILD_TEMPLATES,
  assets: [],
  hooks: buildHooks,
};

// ============================================================================
// MODULE REGISTRY HELPER
// ============================================================================

/**
 * Register the Build module with a module system
 */
export function registerBuildModule(moduleSystem: {
  register: (module: Module) => void;
}): void {
  moduleSystem.register(BUILD_MODULE);
}

// ============================================================================
// PUBSPEC DEPENDENCIES
// ============================================================================

/**
 * Core build dependencies for pubspec
 */
export const BUILD_DEPENDENCIES = {
  dependencies: {},
  devDependencies: {
    build_runner: "^2.4.8",
    build_web_compilers: "^4.0.9",
  },
};

/**
 * Get dependencies based on build configuration
 */
export function getBuildDependenciesForPubspec(_config: BuildModuleConfig): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  return { ...BUILD_DEPENDENCIES };
}

// ============================================================================
// DEPLOYMENT PLATFORM HELPERS
// ============================================================================

/**
 * Supported deployment platforms with descriptions
 */
export const DEPLOYMENT_PLATFORMS = {
  vercel: {
    name: "Vercel",
    description: "Edge deployment with serverless functions and global CDN",
    configFile: "vercel.json",
    cli: "vercel",
    url: "https://vercel.com",
  },
  netlify: {
    name: "Netlify",
    description: "Static hosting with CI/CD, forms, and serverless functions",
    configFile: "netlify.toml",
    cli: "netlify",
    url: "https://netlify.com",
  },
  firebase: {
    name: "Firebase Hosting",
    description: "Google's hosting with CDN, SSL, and Firebase integration",
    configFile: "firebase.json",
    cli: "firebase",
    url: "https://firebase.google.com/products/hosting",
  },
  "github-pages": {
    name: "GitHub Pages",
    description: "Free static hosting for GitHub repositories",
    configFile: null,
    cli: "gh",
    url: "https://pages.github.com",
  },
};

/**
 * Get platform-specific setup instructions
 */
export function getDeploymentInstructions(platform: keyof typeof DEPLOYMENT_PLATFORMS): string[] {
  switch (platform) {
    case "vercel":
      return [
        "Install Vercel CLI: npm i -g vercel",
        "Login: vercel login",
        "Deploy: vercel (preview) or vercel --prod (production)",
        "Configure: vercel.json for headers and redirects",
      ];
    case "netlify":
      return [
        "Install Netlify CLI: npm i -g netlify-cli",
        "Login: netlify login",
        "Initialize: netlify init",
        "Deploy: netlify deploy (preview) or netlify deploy --prod (production)",
      ];
    case "firebase":
      return [
        "Install Firebase CLI: npm i -g firebase-tools",
        "Login: firebase login",
        "Initialize: firebase init hosting",
        "Deploy: firebase deploy --only hosting",
      ];
    case "github-pages":
      return [
        "Enable GitHub Pages in repository settings",
        "Set source branch to gh-pages",
        "Build and push: flutter build web && git subtree push --prefix build/web origin gh-pages",
        "Or use GitHub Actions for automated deployment",
      ];
    default:
      return [];
  }
}

// ============================================================================
// BUILD OPTIMIZATION HELPERS
// ============================================================================

/**
 * Recommended optimizations for different scenarios
 */
export const OPTIMIZATION_PRESETS = {
  development: {
    treeShake: false,
    minify: false,
    sourceMaps: true,
    splitChunks: false,
    lazyLoading: false,
    preloadAssets: false,
    compressAssets: false,
    webRenderer: "html" as const,
    wasmSupport: true,
    cacheVersion: "dev",
  },
  staging: {
    treeShake: true,
    minify: true,
    sourceMaps: true,
    splitChunks: true,
    lazyLoading: true,
    preloadAssets: true,
    compressAssets: true,
    webRenderer: "auto" as const,
    wasmSupport: true,
    cacheVersion: "staging",
  },
  production: {
    treeShake: true,
    minify: true,
    sourceMaps: false,
    splitChunks: true,
    lazyLoading: true,
    preloadAssets: true,
    compressAssets: true,
    webRenderer: "auto" as const,
    wasmSupport: true,
    cacheVersion: "1.0.0",
  },
};

/**
 * Get optimization preset for build mode
 */
export function getOptimizationPreset(mode: "development" | "staging" | "production") {
  return OPTIMIZATION_PRESETS[mode];
}

// ============================================================================
// CI/CD HELPERS
// ============================================================================

/**
 * Supported CI/CD providers
 */
export const CI_PROVIDERS = {
  "github-actions": {
    name: "GitHub Actions",
    configPath: ".github/workflows/",
    extension: ".yml",
    url: "https://github.com/features/actions",
  },
  "gitlab-ci": {
    name: "GitLab CI/CD",
    configPath: "",
    extension: ".gitlab-ci.yml",
    url: "https://docs.gitlab.com/ee/ci/",
  },
  "bitbucket": {
    name: "Bitbucket Pipelines",
    configPath: "",
    extension: "bitbucket-pipelines.yml",
    url: "https://bitbucket.org/product/features/pipelines",
  },
  "azure-pipelines": {
    name: "Azure Pipelines",
    configPath: "",
    extension: "azure-pipelines.yml",
    url: "https://azure.microsoft.com/en-us/products/devops/pipelines",
  },
};

// ============================================================================
// LOCAL DEVELOPMENT HELPERS
// ============================================================================

/**
 * Network throttling presets for offline testing
 */
export const NETWORK_PRESETS = {
  offline: {
    download: 0,
    upload: 0,
    latency: 0,
    description: "No network connectivity",
  },
  "slow-3g": {
    download: 500,
    upload: 500,
    latency: 2000,
    description: "Slow 3G network (500 Kbps)",
  },
  "fast-3g": {
    download: 1500,
    upload: 750,
    latency: 500,
    description: "Fast 3G network (1.5 Mbps)",
  },
  "slow-4g": {
    download: 4000,
    upload: 3000,
    latency: 200,
    description: "Slow 4G network (4 Mbps)",
  },
  "fast-4g": {
    download: 12000,
    upload: 5000,
    latency: 100,
    description: "Fast 4G network (12 Mbps)",
  },
};

/**
 * DevTools instructions for testing
 */
export const DEV_TOOLS_TIPS = [
  "Open DevTools: F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows/Linux)",
  "Network tab: Monitor requests, throttle connection, test offline",
  "Application tab: Inspect service worker, cache storage, IndexedDB",
  "Lighthouse tab: Run PWA audits directly in DevTools",
  "Console tab: Debug JavaScript and view service worker logs",
  "Performance tab: Profile app performance and identify bottlenecks",
];

// ============================================================================
// BEST PRACTICES
// ============================================================================

export const BUILD_BEST_PRACTICES = [
  "Use tree shaking to remove unused code and icons",
  "Enable minification for production builds",
  "Configure proper cache headers for static assets",
  "Use CanvasKit renderer for complex UIs, HTML renderer for simpler apps",
  "Implement lazy loading for large features",
  "Compress assets with gzip or brotli",
  "Use a CDN for global distribution",
  "Set up CI/CD for automated deployments",
  "Test offline functionality before deployment",
  "Run Lighthouse audits to ensure PWA best practices",
  "Version your service worker cache properly",
  "Use environment variables for configuration",
  "Monitor bundle size and set size budgets",
  "Enable source maps only for debugging, not production",
  "Test on multiple browsers and devices",
];

export default BUILD_MODULE;
