/**
 * Testing Module Configuration
 *
 * Types and defaults for auto-generated tests (unit, widget, integration)
 */

import { z } from "zod";

// ============================================================================
// TEST TYPES
// ============================================================================

export type TestType = "unit" | "widget" | "integration" | "golden";

export type CoverageLevel = 70 | 80 | 90 | 100;

export interface TestMethodConfig {
  name: string;
  description?: string;
  async: boolean;
  expectationType: "equals" | "throws" | "notNull" | "isEmpty" | "isTrue" | "isFalse" | "contains";
  expectedValue?: unknown;
}

export interface MockDefinition {
  className: string;
  methods: string[];
  properties: string[];
}

export interface TestSuiteConfig {
  targetFile: string;
  className: string;
  testType: TestType;
  mocks: MockDefinition[];
  methods: TestMethodConfig[];
  setupCode?: string;
  teardownCode?: string;
}

// ============================================================================
// MODULE CONFIG
// ============================================================================

export interface TestingModuleConfig {
  defaultCoverage: CoverageLevel;
  generateMocks: boolean;
  useMockito: boolean;
  useGoldenToolkit: boolean;
  testDirectory: string;
  integrationTestDirectory: string;
  goldenDirectory: string;
  suites: TestSuiteConfig[];
  excludePatterns: string[];
  coverageExclusions: string[];
}

export const DEFAULT_TESTING_CONFIG: TestingModuleConfig = {
  defaultCoverage: 80,
  generateMocks: true,
  useMockito: true,
  useGoldenToolkit: false,
  testDirectory: "test",
  integrationTestDirectory: "integration_test",
  goldenDirectory: "test/golden",
  suites: [],
  excludePatterns: ["**/*.g.dart", "**/*.freezed.dart"],
  coverageExclusions: [
    "lib/generated/**",
    "lib/**/*.g.dart",
    "lib/**/*.freezed.dart",
  ],
};

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const MockDefinitionSchema = z.object({
  className: z.string().min(1, "Class name is required"),
  methods: z.array(z.string()).default([]),
  properties: z.array(z.string()).default([]),
});

export const TestMethodConfigSchema = z.object({
  name: z.string().min(1, "Method name is required"),
  description: z.string().optional(),
  async: z.boolean().default(false),
  expectationType: z.enum(["equals", "throws", "notNull", "isEmpty", "isTrue", "isFalse", "contains"]),
  expectedValue: z.unknown().optional(),
});

export const TestSuiteConfigSchema = z.object({
  targetFile: z.string().min(1, "Target file is required"),
  className: z.string().min(1, "Class name is required"),
  testType: z.enum(["unit", "widget", "integration", "golden"]),
  mocks: z.array(MockDefinitionSchema).default([]),
  methods: z.array(TestMethodConfigSchema).default([]),
  setupCode: z.string().optional(),
  teardownCode: z.string().optional(),
});

export const TestingConfigSchema = z.object({
  defaultCoverage: z.union([z.literal(70), z.literal(80), z.literal(90), z.literal(100)]),
  generateMocks: z.boolean(),
  useMockito: z.boolean(),
  useGoldenToolkit: z.boolean(),
  testDirectory: z.string(),
  integrationTestDirectory: z.string(),
  goldenDirectory: z.string(),
  suites: z.array(TestSuiteConfigSchema),
  excludePatterns: z.array(z.string()),
  coverageExclusions: z.array(z.string()),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export function fileNameToClassName(fileName: string): string {
  // Remove extension and convert to PascalCase
  const withoutExt = fileName.replace(/\.dart$/, "");
  return toPascalCase(withoutExt);
}

export function classNameToFileName(className: string): string {
  return toSnakeCase(className) + ".dart";
}
