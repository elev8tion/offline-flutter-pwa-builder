/**
 * Testing Module
 *
 * Auto-generate unit, widget, and integration tests for Flutter projects.
 * Supports Mockito mocks, golden tests, coverage configuration.
 */

import type { Module } from "../../core/types.js";
import {
  TestingModuleConfig,
  DEFAULT_TESTING_CONFIG,
  TestingConfigSchema,
  TestType,
  CoverageLevel,
  TestSuiteConfig,
  MockDefinition,
  TestMethodConfig,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  fileNameToClassName,
  classNameToFileName,
} from "./config.js";
import {
  TESTING_TOOLS,
  TestingToolContext,
  handleTestingTool,
  GenerateTestsInputSchema,
  GenerateMocksInputSchema,
  ConfigureCoverageInputSchema,
  GenerateWidgetTestInputSchema,
  GenerateIntegrationTestInputSchema,
  RunTestsWithCoverageInputSchema,
} from "./tools.js";
import { testingHooks, registerTestingHelpers } from "./hooks.js";
import { TESTING_TEMPLATES } from "./templates.js";

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const TestingModule: Module = {
  id: "testing",
  name: "Testing Module",
  version: "1.0.0",
  description: "Auto-generate unit, widget, and integration tests with Mockito mocks and coverage analysis",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: TestingConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_TESTING_CONFIG as unknown as Record<string, unknown>,
  hooks: testingHooks,
  templates: TESTING_TEMPLATES,
  assets: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

// Config exports
export type {
  TestingModuleConfig,
  TestType,
  CoverageLevel,
  TestSuiteConfig,
  MockDefinition,
  TestMethodConfig,
};

export {
  DEFAULT_TESTING_CONFIG,
  TestingConfigSchema,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  fileNameToClassName,
  classNameToFileName,
};

// Tools exports
export type { TestingToolContext };

export {
  TESTING_TOOLS,
  handleTestingTool,
  GenerateTestsInputSchema,
  GenerateMocksInputSchema,
  ConfigureCoverageInputSchema,
  GenerateWidgetTestInputSchema,
  GenerateIntegrationTestInputSchema,
  RunTestsWithCoverageInputSchema,
};

// Hooks exports
export { testingHooks, registerTestingHelpers };

// Templates exports
export { TESTING_TEMPLATES };

// Module export
export default TestingModule;
