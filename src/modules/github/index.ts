/**
 * GitHub Module
 *
 * Provides GitHub repository import and analysis capabilities for Flutter projects.
 *
 * Features:
 * - Clone repositories from GitHub
 * - Analyze Flutter project architecture and dependencies
 * - Extract models, screens, and widgets
 * - Generate rebuild schemas for migration
 * - Import and rebuild projects with EDC design system
 */

import type { Module } from "../../core/types.js";
import { DEFAULT_GITHUB_CONFIG, GithubConfigSchema } from "./config.js";
import { githubHooks } from "./hooks.js";
import { GITHUB_TOOLS, handleGithubTool } from "./tools.js";

// Re-export types and utilities
export * from "./config.js";
export { githubHooks };
export { GITHUB_TOOLS, handleGithubTool };

// ============================================================================
// TOOLS REGISTRY
// ============================================================================

// Tools are now imported from tools.ts

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const GITHUB_MODULE: Module = {
  id: "github",
  name: "GitHub Import",
  version: "1.0.0",
  description: "Import and analyze Flutter projects from GitHub repositories",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: GithubConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_GITHUB_CONFIG as unknown as Record<string, unknown>,
  templates: [], // GitHub module doesn't use templates
  assets: [], // GitHub module doesn't need assets
  hooks: githubHooks,
};

// ============================================================================
// MODULE REGISTRY HELPER
// ============================================================================

/**
 * Register the GitHub module with a module system
 */
export function registerGithubModule(moduleSystem: {
  register: (module: Module) => void;
}): void {
  moduleSystem.register(GITHUB_MODULE);
}

// ============================================================================
// SYSTEM DEPENDENCIES
// ============================================================================

/**
 * Required system dependencies for GitHub module functionality
 */
export const GITHUB_SYSTEM_DEPENDENCIES = {
  required: [
    {
      name: "git",
      command: "git --version",
      description: "Git version control system",
      installUrl: "https://git-scm.com/downloads",
    },
  ],
  optional: [
    {
      name: "flutter",
      command: "flutter --version",
      description: "Flutter SDK for project validation",
      installUrl: "https://flutter.dev/docs/get-started/install",
    },
  ],
};

/**
 * Verify system dependencies are installed
 */
export async function verifyGithubDependencies(): Promise<{
  satisfied: boolean;
  missing: string[];
  warnings: string[];
}> {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required dependencies
  for (const dep of GITHUB_SYSTEM_DEPENDENCIES.required) {
    try {
      // Basic check - actual implementation would use child_process
      // This is a placeholder for the structure
      missing.push(dep.name);
    } catch {
      missing.push(dep.name);
    }
  }

  // Check optional dependencies
  for (const dep of GITHUB_SYSTEM_DEPENDENCIES.optional) {
    try {
      // Basic check - actual implementation would use child_process
      warnings.push(`Optional: ${dep.name} not found`);
    } catch {
      warnings.push(`Optional: ${dep.name} not found`);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
    warnings,
  };
}

export default GITHUB_MODULE;
