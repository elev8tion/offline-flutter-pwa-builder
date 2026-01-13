/**
 * Drift Module
 *
 * Provides SQLite + WASM + OPFS offline storage capabilities for Flutter PWAs.
 *
 * Features:
 * - SQLite database with Drift ORM
 * - Web support via WASM and Web Workers
 * - OPFS (Origin Private File System) for persistent storage
 * - Optional SQLCipher encryption
 * - Automatic migration support
 * - Sync queue for offline changes
 */

import type { Module } from "../../core/types.js";
import { DriftConfig, DEFAULT_DRIFT_CONFIG, DriftConfigSchema } from "./config.js";
import { driftHooks } from "./hooks.js";
import { DRIFT_TOOLS, handleDriftTool, type DriftToolContext } from "./tools.js";
import { DRIFT_TEMPLATES } from "./templates.js";

// Re-export types and utilities
export * from "./config.js";
export { driftHooks, handleDriftTool, DRIFT_TOOLS, DRIFT_TEMPLATES };
export type { DriftToolContext };

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const DRIFT_MODULE: Module = {
  id: "drift",
  name: "Drift Database",
  version: "2.14.0",
  description: "SQLite + WASM + OPFS offline storage with optional encryption",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: DriftConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_DRIFT_CONFIG as unknown as Record<string, unknown>,
  templates: DRIFT_TEMPLATES,
  assets: [
    {
      src: "https://github.com/nicnl/nicnl.github.io/releases/download/sqlite3.wasm/sqlite3.wasm",
      dest: "web/sqlite3.wasm",
      type: "file",
    },
    {
      src: "generated",
      dest: "web/drift_worker.js",
      type: "file",
    },
  ],
  hooks: driftHooks,
};

// ============================================================================
// MODULE REGISTRY HELPER
// ============================================================================

/**
 * Register the Drift module with a module system
 */
export function registerDriftModule(moduleSystem: {
  register: (module: Module) => void;
}): void {
  moduleSystem.register(DRIFT_MODULE);
}

// ============================================================================
// PUBSPEC DEPENDENCIES
// ============================================================================

export const DRIFT_DEPENDENCIES = {
  dependencies: {
    drift: "^2.14.0",
    drift_flutter: "^0.1.0",
    sqlite3_flutter_libs: "^0.5.18",
    path_provider: "^2.1.1",
    path: "^1.8.3",
  },
  devDependencies: {
    drift_dev: "^2.14.0",
    build_runner: "^2.4.0",
  },
};

export const DRIFT_ENCRYPTION_DEPENDENCIES = {
  dependencies: {
    sqlcipher_flutter_libs: "^0.6.0",
    flutter_secure_storage: "^9.0.0",
    crypto: "^3.0.3",
  },
};

export const DRIFT_WEB_DEPENDENCIES = {
  dependencies: {
    drift: "^2.14.0",
  },
};

/**
 * Get required pubspec dependencies based on config
 */
export function getDriftDependencies(config: DriftConfig): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  if (config.encryption) {
    // When encryption is enabled, use sqlcipher instead of sqlite3_flutter_libs
    const { sqlite3_flutter_libs: _, ...baseDeps } = DRIFT_DEPENDENCIES.dependencies;
    return {
      dependencies: {
        ...baseDeps,
        ...DRIFT_ENCRYPTION_DEPENDENCIES.dependencies,
      },
      devDependencies: { ...DRIFT_DEPENDENCIES.devDependencies },
    };
  }

  return {
    dependencies: { ...DRIFT_DEPENDENCIES.dependencies },
    devDependencies: { ...DRIFT_DEPENDENCIES.devDependencies },
  };
}

// ============================================================================
// BUILD CONFIGURATION
// ============================================================================

export const DRIFT_BUILD_CONFIG = `
# build.yaml
targets:
  $default:
    builders:
      drift_dev:
        options:
          generate_connect_constructor: true
          scoped_dart_components: true
`;

// ============================================================================
// WEB HEADERS CONFIGURATION
// ============================================================================

export const DRIFT_WEB_HEADERS = {
  // Required for SharedArrayBuffer (needed by WASM threads)
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

/**
 * Generate web server configuration for various platforms
 */
export function generateWebConfig(platform: "vercel" | "netlify" | "firebase"): string {
  switch (platform) {
    case "vercel":
      return `{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}`;

    case "netlify":
      return `[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
`;

    case "firebase":
      return `{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
          { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
        ]
      }
    ]
  }
}`;

    default:
      return "";
  }
}

export default DRIFT_MODULE;
