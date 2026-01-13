/**
 * Build Module Hooks
 *
 * Lifecycle hooks for the build module, handling installation,
 * code generation, and build processes.
 */

import type { ModuleHooks, HookContext, GeneratedFile } from "../../core/types.js";
import { BuildModuleConfig, DEFAULT_BUILD_CONFIG } from "./config.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get build configuration from hook context
 */
function getBuildConfig(ctx: HookContext): BuildModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "build");
  return {
    ...DEFAULT_BUILD_CONFIG,
    ...((moduleConfig?.config as Partial<BuildModuleConfig>) ?? {}),
  };
}

// ============================================================================
// BUILD MODULE HOOKS
// ============================================================================

export const buildHooks: ModuleHooks = {
  /**
   * Called when the build module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getBuildConfig(ctx);
    console.log(`[Build Module] Installing for project: ${ctx.project.name}`);
    console.log(`[Build Module] Deployment platform: ${config.deployment.platform}`);
    console.log(`[Build Module] Build mode: ${config.environment.mode}`);

    // Log dependencies that would be added
    console.log("[Build Module] Dependencies to add:");
    console.log("  - build_runner: ^2.4.8");
    console.log("  - build_web_compilers: ^4.0.9");
  },

  /**
   * Called before code generation starts
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getBuildConfig(ctx);
    console.log(`[Build Module] Preparing code generation for: ${ctx.project.name}`);

    // Validate configuration
    if (!config.deployment.platform) {
      console.warn("[Build Module] No deployment platform configured");
    }

    // Set cache version if not set
    if (!config.optimization.cacheVersion) {
      console.log("[Build Module] Generating cache version...");
    }
  },

  /**
   * Called to generate module-specific files
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getBuildConfig(ctx);
    const files: GeneratedFile[] = [];

    // Generate deployment configuration files
    switch (config.deployment.platform) {
      case "vercel":
        files.push({
          path: "vercel.json",
          content: generateVercelConfig(ctx.project.name, config),
          module: "build",
        });
        break;

      case "netlify":
        files.push({
          path: "netlify.toml",
          content: generateNetlifyConfig(config),
          module: "build",
        });
        break;

      case "firebase":
        files.push({
          path: "firebase.json",
          content: generateFirebaseConfig(ctx.project.name, config),
          module: "build",
        });
        files.push({
          path: ".firebaserc",
          content: generateFirebaseRC(ctx.project.name),
          module: "build",
        });
        break;

      case "github-pages":
        // GitHub Pages uses GitHub Actions workflow
        break;
    }

    // Generate CI/CD workflow if configured
    if (config.cicd) {
      const workflowFile = generateCIWorkflow(ctx.project.name, config);
      if (workflowFile) {
        files.push(workflowFile);
      }
    }

    // Generate environment configuration
    files.push({
      path: "lib/core/config/environment.dart",
      content: generateEnvironmentDart(config),
      module: "build",
    });

    // Generate build script
    files.push({
      path: "scripts/build.sh",
      content: generateBuildScript(config),
      module: "build",
    });

    // Generate dev server script
    files.push({
      path: "scripts/dev.sh",
      content: generateDevScript(config),
      module: "build",
    });

    console.log(`[Build Module] Generated ${files.length} files`);
    return files;
  },

  /**
   * Called after code generation completes
   */
  afterGenerate: async (ctx: HookContext): Promise<void> => {
    console.log(`[Build Module] Code generation complete for: ${ctx.project.name}`);
  },

  /**
   * Called before build starts
   */
  beforeBuild: async (ctx: HookContext): Promise<void> => {
    const config = getBuildConfig(ctx);
    console.log(`[Build Module] Starting build for: ${ctx.project.name}`);
    console.log(`[Build Module] Mode: ${config.environment.mode}`);
    console.log(`[Build Module] Web renderer: ${config.optimization.webRenderer}`);
    console.log(`[Build Module] Tree shaking: ${config.optimization.treeShake}`);
    console.log(`[Build Module] Minification: ${config.optimization.minify}`);
  },

  /**
   * Called after build completes
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Build Module] Build complete");
    console.log("[Build Module] Output: build/web");
  },

  /**
   * Called when the build module is uninstalled
   */
  onUninstall: async (_ctx: HookContext): Promise<void> => {
    console.log("[Build Module] Uninstalling build module");
    console.log("[Build Module] Cleaning up deployment configurations...");
  },
};

// ============================================================================
// FILE GENERATORS
// ============================================================================

/**
 * Generate vercel.json configuration
 */
function generateVercelConfig(projectName: string, config: BuildModuleConfig): string {
  const vercelConfig: Record<string, unknown> = {
    version: 2,
    name: projectName,
    builds: [
      {
        src: "build/web/**",
        use: "@vercel/static",
      },
    ],
    routes: [
      {
        src: "/(.*)",
        dest: "/build/web/$1",
      },
    ],
  };

  // Add headers if configured
  if (config.deployment.vercel?.headers) {
    vercelConfig.headers = config.deployment.vercel.headers;
  } else {
    // Default security headers
    vercelConfig.headers = [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/flutter_service_worker.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  }

  return JSON.stringify(vercelConfig, null, 2);
}

/**
 * Generate netlify.toml configuration
 */
function generateNetlifyConfig(config: BuildModuleConfig): string {
  const netlifyConfig = config.deployment.netlify || {
    buildCommand: "flutter build web --release",
    publishDirectory: "build/web",
  };

  return `# Netlify Configuration
# Generated by Offline Flutter PWA Builder

[build]
  command = "${netlifyConfig.buildCommand}"
  publish = "${netlifyConfig.publishDirectory}"

[build.environment]
  FLUTTER_WEB = "true"

# Security Headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Service Worker Headers
[[headers]]
  for = "/flutter_service_worker.js"
  [headers.values]
    Cache-Control = "no-cache"
    Service-Worker-Allowed = "/"

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# SPA Fallback
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
}

/**
 * Generate firebase.json configuration
 */
function generateFirebaseConfig(_projectName: string, config: BuildModuleConfig): string {
  const firebaseConfig = {
    hosting: {
      public: config.deployment.firebase?.public || "build/web",
      ignore: config.deployment.firebase?.ignore || ["firebase.json", "**/.*", "**/node_modules/**"],
      rewrites: [
        {
          source: "**",
          destination: "/index.html",
        },
      ],
      headers: [
        {
          source: "**",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "X-XSS-Protection", value: "1; mode=block" },
          ],
        },
        {
          source: "/flutter_service_worker.js",
          headers: [
            { key: "Cache-Control", value: "no-cache" },
            { key: "Service-Worker-Allowed", value: "/" },
          ],
        },
        {
          source: "**/*.@(js|css|wasm)",
          headers: [
            { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          ],
        },
      ],
    },
  };

  return JSON.stringify(firebaseConfig, null, 2);
}

/**
 * Generate .firebaserc configuration
 */
function generateFirebaseRC(projectName: string): string {
  return JSON.stringify({
    projects: {
      default: projectName,
    },
  }, null, 2);
}

/**
 * Generate CI/CD workflow file
 */
function generateCIWorkflow(projectName: string, config: BuildModuleConfig): GeneratedFile | null {
  if (!config.cicd) return null;

  switch (config.cicd.provider) {
    case "github-actions":
      return {
        path: ".github/workflows/build-deploy.yml",
        content: generateGitHubActionsWorkflow(projectName, config),
        module: "build",
      };

    case "gitlab-ci":
      return {
        path: ".gitlab-ci.yml",
        content: generateGitLabCIWorkflow(config),
        module: "build",
      };

    default:
      return null;
  }
}

/**
 * Generate GitHub Actions workflow
 */
function generateGitHubActionsWorkflow(_projectName: string, config: BuildModuleConfig): string {
  const branches = config.cicd?.triggers.branches || ["main"];

  return `# GitHub Actions Workflow
# Generated by Offline Flutter PWA Builder

name: Build and Deploy

on:
  push:
    branches: [${branches.map(b => `'${b}'`).join(", ")}]
  pull_request:
    branches: [${branches.map(b => `'${b}'`).join(", ")}]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.27.x'
          channel: 'stable'
          cache: true

      - name: Install dependencies
        run: flutter pub get

      - name: Analyze code
        run: flutter analyze

      - name: Run tests
        run: flutter test

      - name: Build web
        run: flutter build web --release --tree-shake-icons

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: build/web

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: web-build
          path: build/web

      - name: Deploy to ${config.deployment.platform}
        run: echo "Deploy step - configure based on platform"
        # Add platform-specific deployment commands
`;
}

/**
 * Generate GitLab CI workflow
 */
function generateGitLabCIWorkflow(config: BuildModuleConfig): string {
  return `# GitLab CI Configuration
# Generated by Offline Flutter PWA Builder

image: ghcr.io/cirruslabs/flutter:stable

stages:
  - install
  - analyze
  - test
  - build
  - deploy

variables:
  PUB_CACHE: $CI_PROJECT_DIR/.pub-cache

cache:
  key: \${CI_COMMIT_REF_SLUG}
  paths:
    - .pub-cache/

install:
  stage: install
  script:
    - flutter pub get

analyze:
  stage: analyze
  script:
    - flutter analyze
  needs: [install]

test:
  stage: test
  script:
    - flutter test
  needs: [install]

build:
  stage: build
  script:
    - flutter build web --release
  artifacts:
    paths:
      - build/web
  needs: [analyze, test]

deploy:
  stage: deploy
  script:
    - echo "Deploy to ${config.deployment.platform}"
  only:
    - main
  needs: [build]
`;
}

/**
 * Generate environment.dart configuration
 */
function generateEnvironmentDart(config: BuildModuleConfig): string {
  const envVars = config.environment.variables || [];

  return `// Environment Configuration
// Generated by Offline Flutter PWA Builder

/// Application environment
enum Environment { development, staging, production }

/// Current build environment
const Environment currentEnvironment = Environment.${config.environment.mode};

/// Environment configuration class
class EnvConfig {
  static const String appName = String.fromEnvironment('APP_NAME', defaultValue: 'Flutter PWA');
  static const String appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');
  static const bool isProduction = currentEnvironment == Environment.production;
  static const bool isDevelopment = currentEnvironment == Environment.development;

${envVars.map(v => `  /// ${v.description || v.name}
  static const String ${toCamelCase(v.name)} = String.fromEnvironment('${v.name}'${v.value ? `, defaultValue: '${v.value}'` : ""});`).join("\n\n")}

  /// Get environment-specific API base URL
  static String get apiBaseUrl {
    switch (currentEnvironment) {
      case Environment.production:
        return const String.fromEnvironment('API_URL_PROD', defaultValue: 'https://api.example.com');
      case Environment.staging:
        return const String.fromEnvironment('API_URL_STAGING', defaultValue: 'https://staging-api.example.com');
      case Environment.development:
      default:
        return const String.fromEnvironment('API_URL_DEV', defaultValue: 'http://localhost:3000');
    }
  }
}
`;
}

/**
 * Generate build.sh script
 */
function generateBuildScript(config: BuildModuleConfig): string {
  const mode = config.environment.mode;
  const renderer = config.optimization.webRenderer;

  return `#!/bin/bash
# Build Script
# Generated by Offline Flutter PWA Builder

set -e

echo "Building Flutter PWA..."
echo "Mode: ${mode}"
echo "Web Renderer: ${renderer}"

# Clean previous build
flutter clean

# Get dependencies
flutter pub get

# Run code generation (if needed)
if [ -f "build.yaml" ]; then
  flutter pub run build_runner build --delete-conflicting-outputs
fi

# Build for web
flutter build web \\
  ${mode === "production" ? "--release" : "--profile"} \\
  ${renderer !== "auto" ? `--web-renderer=${renderer}` : ""} \\
  ${config.optimization.treeShake ? "--tree-shake-icons" : ""} \\
  ${config.optimization.sourceMaps ? "--source-maps" : ""}

echo "Build complete! Output: build/web"

# Show build size
du -sh build/web
`;
}

/**
 * Generate dev.sh script
 */
function generateDevScript(config: BuildModuleConfig): string {
  const server = config.localDev.server;

  return `#!/bin/bash
# Development Server Script
# Generated by Offline Flutter PWA Builder

set -e

echo "Starting development server..."
echo "Port: ${server.port}"
echo "Host: ${server.host}"

# Start Flutter web dev server
flutter run -d chrome \\
  --web-port=${server.port} \\
  ${server.webRenderer !== "auto" ? `--web-renderer=${server.webRenderer}` : ""} \\
  ${server.debugMode ? "--debug" : ""}
`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase());
}

export default buildHooks;
