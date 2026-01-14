/**
 * GitHub Module Configuration
 *
 * Type definitions and validation schemas for GitHub import functionality.
 */

import { z } from 'zod';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CloneResult {
  success: boolean;
  localPath: string;
  repoName: string;
  branch: string;
  commit: string;
  size: number;
}

export interface FolderNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: FolderNode[];
  fileType?: 'dart' | 'yaml' | 'json' | 'asset' | 'other';
  category?: 'model' | 'screen' | 'widget' | 'provider' | 'service' | 'theme' | 'route' | 'config' | 'unknown';
}

export interface FieldDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  annotations: string[];
}

export interface ModelDefinition {
  name: string;
  filePath: string;
  fields: FieldDefinition[];
  annotations: string[];
  relationships: Array<{
    type: 'hasOne' | 'hasMany' | 'belongsTo';
    target: string;
    fieldName: string;
  }>;
  isImmutable: boolean;
  hasJson: boolean;
}

export interface ScreenDefinition {
  name: string;
  filePath: string;
  type: 'stateful' | 'stateless' | 'hook';
  route?: string;
  scaffold: {
    hasAppBar: boolean;
    hasBottomNav: boolean;
    hasDrawer: boolean;
    hasFab: boolean;
  };
  providers: string[];
  widgets: string[];
  layout: 'column' | 'row' | 'stack' | 'list' | 'grid' | 'custom';
}

export interface WidgetDefinition {
  name: string;
  filePath: string;
  type: 'stateful' | 'stateless' | 'hook';
  props: FieldDefinition[];
  isReusable: boolean;
}

export interface AnalysisResult {
  name: string;
  description: string;
  flutterVersion: string;
  dartVersion: string;
  architecture: {
    detected: 'clean' | 'feature-first' | 'layer-first' | 'custom';
    confidence: number;
    structure: FolderNode;
  };
  dependencies: {
    stateManagement: 'riverpod' | 'bloc' | 'provider' | 'getx' | 'mobx' | 'none';
    database: 'drift' | 'sqflite' | 'hive' | 'isar' | 'none';
    networking: 'dio' | 'http' | 'chopper' | 'retrofit' | 'none';
    navigation: 'go_router' | 'auto_route' | 'navigator' | 'none';
  };
  models: ModelDefinition[];
  screens: ScreenDefinition[];
  widgets: WidgetDefinition[];
  stats: {
    totalFiles: number;
    dartFiles: number;
    testFiles: number;
    linesOfCode: number;
  };
}

export interface RebuildSchema {
  projectDefinition: any;
  migrations: {
    models: any[];
    screens: any[];
    widgets: any[];
  };
  generationPlan: {
    theme: string[];
    models: string[];
    screens: string[];
    widgets: string[];
    state: string[];
  };
  preservedFiles: string[];
  warnings: string[];
  driftSchemas?: any[];
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const GithubCloneRepositorySchema = z.object({
  url: z.string().url(),
  branch: z.string().default('main'),
  depth: z.number().default(1),
});

export const GithubAnalyzeProjectSchema = z.object({
  localPath: z.string(),
  analyzeDepth: z.enum(['shallow', 'medium', 'deep']).default('deep'),
});

export const GithubExtractModelsSchema = z.object({
  localPath: z.string(),
  modelPaths: z.array(z.string()).optional(),
});

export const GithubExtractScreensSchema = z.object({
  localPath: z.string(),
  screenPaths: z.array(z.string()).optional(),
});

export const GithubCreateRebuildSchemaSchema = z.object({
  analysisResult: z.any(),
  options: z.object({
    keepModels: z.boolean().default(true),
    keepScreenStructure: z.boolean().default(true),
    applyEdcDesign: z.boolean().default(true),
    addOfflineSupport: z.boolean().default(true),
    targetArchitecture: z.enum(['clean', 'feature-first', 'layer-first', 'keep']).default('keep'),
    targetStateManagement: z.enum(['riverpod', 'bloc', 'keep']).default('keep'),
  }).optional(),
});

export const GithubRebuildProjectSchema = z.object({
  rebuildSchema: z.any(),
  outputPath: z.string(),
  options: z.object({
    runFlutterCreate: z.boolean().default(true),
    formatCode: z.boolean().default(true),
    generateTests: z.boolean().default(false),
  }).optional(),
});

export const GithubImportAndRebuildSchema = z.object({
  url: z.string().url(),
  outputPath: z.string(),
  branch: z.string().default('main'),
  options: z.object({
    analyzeDepth: z.enum(['shallow', 'medium', 'deep']).default('deep'),
    keepModels: z.boolean().default(true),
    keepScreenStructure: z.boolean().default(true),
    applyEdcDesign: z.boolean().default(true),
    addOfflineSupport: z.boolean().default(true),
  }).optional(),
});

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

export interface GithubConfig {
  enabled: boolean;
  tempDirectory: string;
  maxRepoSize: number; // in MB
  cloneTimeout: number; // in seconds
}

export const DEFAULT_GITHUB_CONFIG: GithubConfig = {
  enabled: true,
  tempDirectory: './.github-imports',
  maxRepoSize: 500,
  cloneTimeout: 300,
};

export const GithubConfigSchema = z.object({
  enabled: z.boolean(),
  tempDirectory: z.string(),
  maxRepoSize: z.number().positive(),
  cloneTimeout: z.number().positive(),
});
