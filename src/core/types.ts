/**
 * Core Types for Offline Flutter PWA Builder
 */

// ============================================================================
// PROJECT TYPES
// ============================================================================

export type Architecture = "clean" | "feature-first" | "layer-first";
export type StateManagement = "riverpod" | "bloc" | "provider";
export type TargetPlatform = "web" | "android" | "ios" | "windows" | "macos" | "linux";
export type OfflineStrategy = "offline-first" | "online-first" | "cache-first";
export type DisplayMode = "standalone" | "fullscreen" | "minimal-ui";
export type Orientation = "portrait" | "landscape" | "any";

export interface IconConfig {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable" | "monochrome";
}

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: DisplayMode;
  orientation: Orientation;
  icons: IconConfig[];
  startUrl: string;
  scope: string;
}

export interface SyncConfig {
  enabled: boolean;
  strategy: "manual" | "auto" | "periodic";
  interval?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface OfflineConfig {
  strategy: OfflineStrategy;
  storage: {
    type: "drift";
    encryption: boolean;
    maxSize?: number;
  };
  caching: {
    assets: boolean;
    api: boolean;
    ttl: number;
  };
  sync?: SyncConfig;
}

export interface ModuleConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface ProjectDefinition {
  id: string;
  name: string;
  displayName: string;
  version: string;
  pwa: PWAConfig;
  offline: OfflineConfig;
  architecture: Architecture;
  stateManagement: StateManagement;
  modules: ModuleConfig[];
  targets: TargetPlatform[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface TemplateCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "notIn" | "exists" | "notExists";
  value: unknown;
}

export interface Transform {
  type: "camelCase" | "pascalCase" | "snakeCase" | "kebabCase" | "pluralize" | "singularize";
  field: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  type: "file" | "directory" | "snippet";
  source: string;
  output: {
    path: string;
    filename: string;
    extension: string;
  };
  conditions?: TemplateCondition[];
  transforms?: Transform[];
  requires?: string[];
}

export interface TemplateContext {
  project: ProjectDefinition;
  module?: Module;
  data?: Record<string, unknown>;
}

export interface RenderedFile {
  path: string;
  content: string;
  template: Template;
}

// ============================================================================
// MODULE TYPES
// ============================================================================

export interface ModuleDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface Asset {
  src: string;
  dest: string;
  type: "file" | "directory";
}

export interface HookContext {
  project: ProjectDefinition;
  module: Module;
  fileSystem: FileSystem;
  templateEngine: TemplateEngine;
}

export interface ModuleHooks {
  onInstall?: (ctx: HookContext) => Promise<void>;
  beforeGenerate?: (ctx: HookContext) => Promise<void>;
  onGenerate?: (ctx: HookContext) => Promise<GeneratedFile[]>;
  afterGenerate?: (ctx: HookContext) => Promise<void>;
  beforeBuild?: (ctx: HookContext) => Promise<void>;
  afterBuild?: (ctx: HookContext) => Promise<void>;
  onUninstall?: (ctx: HookContext) => Promise<void>;
}

export interface Module {
  id: string;
  name: string;
  version: string;
  description: string;
  compatibleTargets: TargetPlatform[];
  dependencies: ModuleDependency[];
  conflicts: string[];
  configSchema: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
  templates: Template[];
  assets: Asset[];
  hooks: ModuleHooks;
}

export interface GeneratedFile {
  path: string;
  content: string;
  module?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidationTarget = "project" | "module" | "file" | "code" | "config";
export type Severity = "error" | "warning" | "info";

export interface AutoFix {
  description: string;
  apply: () => Promise<void>;
}

export interface ValidationIssue {
  validator: string;
  severity: Severity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  suggestion?: string;
  autofix?: AutoFix;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationInput {
  target: ValidationTarget;
  content: string | Record<string, unknown>;
  path?: string;
  context?: TemplateContext;
}

export interface Validator {
  id: string;
  name: string;
  target: ValidationTarget;
  patterns?: string[];
  severity: Severity;
  validate: (input: ValidationInput) => Promise<ValidationResult>;
}

// ============================================================================
// SECURITY TYPES
// ============================================================================

export type SecurityTarget = "code" | "config" | "dependency" | "runtime";
export type SecuritySeverity = "critical" | "high" | "medium" | "low";

export interface SecurityFinding {
  policy: string;
  severity: SecuritySeverity;
  message: string;
  file?: string;
  line?: number;
  recommendation: string;
}

export interface SecurityInput {
  target: SecurityTarget;
  content: string | Record<string, unknown>;
  path?: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  severity: SecuritySeverity;
  target: SecurityTarget;
  check: (input: SecurityInput) => Promise<SecurityFinding[]>;
  remediate?: (finding: SecurityFinding) => Promise<void>;
}

// ============================================================================
// FILE SYSTEM TYPES
// ============================================================================

export interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: Date;
}

export interface Transaction {
  write(path: string, content: string): void;
  delete(path: string): void;
  commit(): Promise<void>;
  rollback(): void;
}

export interface FileSystem {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  rmdir(path: string, recursive?: boolean): Promise<void>;
  delete(path: string): Promise<void>;
  list(path: string, pattern?: string): Promise<string[]>;
  stat(path: string): Promise<FileInfo>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  beginTransaction(): Transaction;
}

// ============================================================================
// TEMPLATE ENGINE TYPES
// ============================================================================

export interface TemplateEngine {
  register(template: Template): void;
  unregister(templateId: string): void;
  get(templateId: string): Template | undefined;
  list(): Template[];
  render(templateId: string, context: TemplateContext): Promise<RenderedFile>;
  renderMultiple(templateIds: string[], context: TemplateContext): Promise<RenderedFile[]>;
  renderString(source: string, data: Record<string, unknown>): string;
  preview(templateId: string, context: TemplateContext): string;
  registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
  registerPartial(name: string, source: string): void;
}

// ============================================================================
// TOOL CONTEXT
// ============================================================================

export interface ToolContext {
  projectEngine: ProjectEngine;
  templateEngine: TemplateEngine;
  moduleSystem: ModuleSystem;
  validationFramework: ValidationFramework;
  fileSystem: FileSystem;
}

// Forward declarations for engines (actual implementations in their respective files)
export interface ProjectEngine {
  create(definition: Partial<ProjectDefinition>): Promise<ProjectDefinition>;
  get(id: string): ProjectDefinition | undefined;
  update(id: string, updates: Partial<ProjectDefinition>): Promise<ProjectDefinition>;
  delete(id: string): Promise<void>;
  list(): ProjectDefinition[];
  generate(id: string): Promise<GeneratedFile[]>;
  validate(id: string): Promise<ValidationResult>;
  build(id: string, outputPath: string): Promise<void>;
}

export interface ModuleSystem {
  register(module: Module): void;
  unregister(moduleId: string): void;
  get(moduleId: string): Module | undefined;
  list(): Module[];
  install(projectId: string, moduleId: string, config?: Record<string, unknown>): Promise<void>;
  uninstall(projectId: string, moduleId: string): Promise<void>;
  getInstalled(projectId: string): Module[];
}

export interface ValidationFramework {
  register(validator: Validator): void;
  unregister(validatorId: string): void;
  validate(input: ValidationInput): Promise<ValidationResult>;
  validateProject(project: ProjectDefinition): Promise<ValidationResult>;
}
