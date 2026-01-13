/**
 * State Module Configuration
 *
 * Defines configuration types and schemas for state management in Flutter apps.
 * Supports Riverpod and BLoC patterns with offline sync capabilities.
 */

import { z } from "zod";

// ============================================================================
// PROVIDER TYPES (Riverpod)
// ============================================================================

export type ProviderType =
  | "provider"
  | "stateProvider"
  | "stateNotifierProvider"
  | "futureProvider"
  | "streamProvider"
  | "changeNotifierProvider"
  | "notifierProvider"
  | "asyncNotifierProvider";

export const ProviderTypeSchema = z.enum([
  "provider",
  "stateProvider",
  "stateNotifierProvider",
  "futureProvider",
  "streamProvider",
  "changeNotifierProvider",
  "notifierProvider",
  "asyncNotifierProvider",
]);

export interface ProviderConfig {
  name: string;
  type: ProviderType;
  stateType: string;
  asyncState: boolean;
  autoDispose: boolean;
  family: boolean;
  familyParamType?: string;
  dependencies?: string[];
  initialValue?: string;
  description?: string;
}

export const ProviderConfigSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-zA-Z0-9]*$/),
  type: ProviderTypeSchema,
  stateType: z.string().min(1),
  asyncState: z.boolean().default(false),
  autoDispose: z.boolean().default(true),
  family: z.boolean().default(false),
  familyParamType: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  initialValue: z.string().optional(),
  description: z.string().optional(),
});

// ============================================================================
// BLOC TYPES
// ============================================================================

export interface BlocEventConfig {
  name: string;
  properties?: Array<{ name: string; type: string; required?: boolean }>;
  description?: string;
}

export interface BlocStateConfig {
  name: string;
  properties?: Array<{ name: string; type: string; required?: boolean }>;
  isInitial?: boolean;
  description?: string;
}

export interface BlocConfig {
  name: string;
  events: BlocEventConfig[];
  states: BlocStateConfig[];
  useCubit: boolean;
  useEquatable: boolean;
  useFreezesd: boolean;
  description?: string;
}

export const BlocEventConfigSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  properties: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        required: z.boolean().optional(),
      })
    )
    .optional(),
  description: z.string().optional(),
});

export const BlocStateConfigSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  properties: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        required: z.boolean().optional(),
      })
    )
    .optional(),
  isInitial: z.boolean().optional(),
  description: z.string().optional(),
});

export const BlocConfigSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  events: z.array(BlocEventConfigSchema).min(1),
  states: z.array(BlocStateConfigSchema).min(1),
  useCubit: z.boolean().default(false),
  useEquatable: z.boolean().default(true),
  useFreezesd: z.boolean().default(false),
  description: z.string().optional(),
});

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

export type SyncStrategy = "manual" | "auto" | "periodic";
export type ConflictResolution = "lastWrite" | "serverWins" | "clientWins" | "merge";

export interface OfflineSyncConfig {
  enabled: boolean;
  strategy: SyncStrategy;
  conflictResolution: ConflictResolution;
  periodicInterval?: number; // in seconds
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  queuePersistence: boolean;
}

export const OfflineSyncConfigSchema = z.object({
  enabled: z.boolean().default(true),
  strategy: z.enum(["manual", "auto", "periodic"]).default("auto"),
  conflictResolution: z.enum(["lastWrite", "serverWins", "clientWins", "merge"]).default("lastWrite"),
  periodicInterval: z.number().min(10).max(3600).optional(),
  retryAttempts: z.number().min(0).max(10).default(3),
  retryDelay: z.number().min(100).max(60000).default(1000),
  queuePersistence: z.boolean().default(true),
});

// ============================================================================
// MODULE CONFIG
// ============================================================================

export type StateManagementType = "riverpod" | "bloc" | "provider";

export interface StateModuleConfig {
  type: StateManagementType;
  providers: ProviderConfig[];
  blocs: BlocConfig[];
  offlineSync: OfflineSyncConfig;
  generateTests: boolean;
  codeGeneration: {
    generateFreezed: boolean;
    generateJsonSerializable: boolean;
    generateEquatable: boolean;
  };
}

export const StateModuleConfigSchema = z.object({
  type: z.enum(["riverpod", "bloc", "provider"]).default("riverpod"),
  providers: z.array(ProviderConfigSchema).default([]),
  blocs: z.array(BlocConfigSchema).default([]),
  offlineSync: OfflineSyncConfigSchema,
  generateTests: z.boolean().default(true),
  codeGeneration: z.object({
    generateFreezed: z.boolean().default(false),
    generateJsonSerializable: z.boolean().default(true),
    generateEquatable: z.boolean().default(true),
  }),
});

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_STATE_CONFIG: StateModuleConfig = {
  type: "riverpod",
  providers: [],
  blocs: [],
  offlineSync: {
    enabled: true,
    strategy: "auto",
    conflictResolution: "lastWrite",
    retryAttempts: 3,
    retryDelay: 1000,
    queuePersistence: true,
  },
  generateTests: true,
  codeGeneration: {
    generateFreezed: false,
    generateJsonSerializable: true,
    generateEquatable: true,
  },
};

// ============================================================================
// FEATURE CONFIG (combines Provider/BLoC with UI)
// ============================================================================

export interface FeatureConfig {
  name: string;
  description?: string;
  stateType: StateManagementType;
  hasUI: boolean;
  hasRepository: boolean;
  hasModel: boolean;
  offlineEnabled: boolean;
  operations: ("create" | "read" | "update" | "delete" | "list")[];
}

export const FeatureConfigSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  description: z.string().optional(),
  stateType: z.enum(["riverpod", "bloc", "provider"]).default("riverpod"),
  hasUI: z.boolean().default(true),
  hasRepository: z.boolean().default(true),
  hasModel: z.boolean().default(true),
  offlineEnabled: z.boolean().default(true),
  operations: z
    .array(z.enum(["create", "read", "update", "delete", "list"]))
    .default(["create", "read", "update", "delete", "list"]),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert a name to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Convert a name to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a name to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/[_\s-]+/g, "_");
}

/**
 * Generate provider name from base name
 */
export function generateProviderName(baseName: string, type: ProviderType): string {
  const camel = toCamelCase(baseName);
  switch (type) {
    case "provider":
      return `${camel}Provider`;
    case "stateProvider":
      return `${camel}StateProvider`;
    case "stateNotifierProvider":
      return `${camel}NotifierProvider`;
    case "futureProvider":
      return `${camel}FutureProvider`;
    case "streamProvider":
      return `${camel}StreamProvider`;
    case "changeNotifierProvider":
      return `${camel}ChangeNotifierProvider`;
    case "notifierProvider":
      return `${camel}NotifierProvider`;
    case "asyncNotifierProvider":
      return `${camel}AsyncNotifierProvider`;
    default:
      return `${camel}Provider`;
  }
}

/**
 * Generate BLoC class names
 */
export function generateBlocNames(baseName: string, useCubit: boolean): {
  bloc: string;
  event: string;
  state: string;
  fileName: string;
} {
  const pascal = toPascalCase(baseName);
  const snake = toSnakeCase(baseName);

  return {
    bloc: useCubit ? `${pascal}Cubit` : `${pascal}Bloc`,
    event: `${pascal}Event`,
    state: `${pascal}State`,
    fileName: useCubit ? `${snake}_cubit` : `${snake}_bloc`,
  };
}

/**
 * Get Riverpod dependencies for pubspec
 */
export function getRiverpodDependencies(): Record<string, string> {
  return {
    flutter_riverpod: "^2.4.9",
    riverpod_annotation: "^2.3.3",
  };
}

/**
 * Get Riverpod dev dependencies for pubspec
 */
export function getRiverpodDevDependencies(): Record<string, string> {
  return {
    riverpod_generator: "^2.3.9",
    build_runner: "^2.4.8",
    riverpod_lint: "^2.3.7",
  };
}

/**
 * Get BLoC dependencies for pubspec
 */
export function getBlocDependencies(): Record<string, string> {
  return {
    flutter_bloc: "^8.1.3",
    bloc: "^8.1.2",
    equatable: "^2.0.5",
  };
}

/**
 * Get BLoC dev dependencies for pubspec
 */
export function getBlocDevDependencies(): Record<string, string> {
  return {
    bloc_test: "^9.1.5",
  };
}

/**
 * Get dependencies based on state management type
 */
export function getStateDependencies(type: StateManagementType): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  switch (type) {
    case "riverpod":
      return {
        dependencies: getRiverpodDependencies(),
        devDependencies: getRiverpodDevDependencies(),
      };
    case "bloc":
      return {
        dependencies: getBlocDependencies(),
        devDependencies: getBlocDevDependencies(),
      };
    case "provider":
      return {
        dependencies: { provider: "^6.1.1" },
        devDependencies: {},
      };
    default:
      return { dependencies: {}, devDependencies: {} };
  }
}
