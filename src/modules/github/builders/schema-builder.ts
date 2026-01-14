import { AnalysisResult, RebuildSchema } from '../config.js';
import type { ProjectDefinition } from '../../../core/types.js';

export interface RebuildOptions {
  keepModels?: boolean;
  keepScreenStructure?: boolean;
  applyEdcDesign?: boolean;
  addOfflineSupport?: boolean;
  targetArchitecture?: 'clean' | 'feature-first' | 'layer-first' | 'keep';
  targetStateManagement?: 'riverpod' | 'bloc' | 'keep';
}

export async function createRebuildSchema(
  analysis: AnalysisResult,
  options: RebuildOptions = {}
): Promise<RebuildSchema> {
  const {
    keepModels = true,
    keepScreenStructure = true,
    applyEdcDesign = true,
    addOfflineSupport = true,
    targetArchitecture = 'keep',
    targetStateManagement = 'keep',
  } = options;

  // Determine target architecture
  const architecture = targetArchitecture === 'keep'
    ? analysis.architecture.detected
    : targetArchitecture;

  // Determine target state management
  const stateManagement = targetStateManagement === 'keep'
    ? (analysis.dependencies.stateManagement === 'none' ? 'riverpod' : analysis.dependencies.stateManagement)
    : targetStateManagement;

  // Create project definition
  const projectDefinition: Partial<ProjectDefinition> = {
    name: analysis.name,
    architecture: architecture === 'custom' ? 'layer-first' : architecture,
    stateManagement: stateManagement as 'riverpod' | 'bloc',
    targets: ['web'],
    pwa: {
      name: analysis.name,
      shortName: analysis.name.substring(0, 12),
      description: analysis.description,
      themeColor: '#6366F1',
      backgroundColor: '#FFFFFF',
      display: 'standalone' as const,
      orientation: 'any' as const,
      icons: [],
      startUrl: '/',
      scope: '/',
    },
    offline: addOfflineSupport ? {
      strategy: 'offline-first' as const,
      storage: { type: 'drift' as const, encryption: false },
      caching: { assets: true, api: true, ttl: 3600 },
      sync: { enabled: true, strategy: 'auto' as const },
    } : undefined,
    flutter: {
      version: analysis.flutterVersion || '3.10.0',
    },
    modules: [],
  };

  // Determine which modules to install
  if (addOfflineSupport) {
    projectDefinition.modules!.push({ id: 'drift', enabled: true, config: {} });
    projectDefinition.modules!.push({ id: 'pwa', enabled: true, config: {} });
  }

  if (applyEdcDesign) {
    projectDefinition.modules!.push({ id: 'design', enabled: true, config: {} });
  }

  projectDefinition.modules!.push({ id: 'state', enabled: true, config: {} });

  // Plan model migrations
  const modelMigrations = keepModels
    ? analysis.models.map(model => ({
        action: 'preserve' as const,
        source: model.filePath,
        name: model.name,
      }))
    : analysis.models.map(model => ({
        action: 'migrate-to-drift' as const,
        source: model.filePath,
        name: model.name,
        fields: model.fields,
      }));

  // Plan screen migrations
  const screenMigrations = keepScreenStructure
    ? analysis.screens.map(screen => ({
        action: 'preserve-structure' as const,
        source: screen.filePath,
        name: screen.name,
        applyEdcTheme: applyEdcDesign,
      }))
    : analysis.screens.map(screen => ({
        action: 'regenerate' as const,
        source: screen.filePath,
        name: screen.name,
        type: screen.type,
        scaffold: screen.scaffold,
      }));

  // Plan widget migrations
  const widgetMigrations = analysis.widgets.map(widget => ({
    action: 'preserve' as const,
    source: widget.filePath,
    name: widget.name,
  }));

  // Generate file list for each category
  const generationPlan = {
    theme: applyEdcDesign ? [
      'lib/theme/app_theme.dart',
      'lib/theme/edc_tokens.dart',
      'lib/theme/edc_gradients.dart',
      'lib/theme/glass_components.dart',
    ] : [],
    models: keepModels ? [] : analysis.models.map(m => `lib/models/${toSnakeCase(m.name)}.dart`),
    screens: analysis.screens.map(s => `lib/screens/${toSnakeCase(s.name)}.dart`),
    widgets: [], // Preserve existing widgets
    state: [
      `lib/providers/app_providers.dart`,
    ],
  };

  // Files to preserve
  const preservedFiles: string[] = [];
  if (keepModels) {
    preservedFiles.push(...analysis.models.map(m => m.filePath));
  }
  if (keepScreenStructure) {
    preservedFiles.push(...analysis.screens.map(s => s.filePath));
  }
  preservedFiles.push(...analysis.widgets.map(w => w.filePath));

  // Warnings
  const warnings: string[] = [];
  if (analysis.architecture.confidence < 70) {
    warnings.push(`Low architecture confidence (${analysis.architecture.confidence}%). Manual review recommended.`);
  }
  if (analysis.dependencies.stateManagement === 'none') {
    warnings.push('No state management detected. Adding Riverpod by default.');
  }
  if (!keepModels && analysis.models.length > 20) {
    warnings.push(`Migrating ${analysis.models.length} models to Drift. This may require manual adjustments.`);
  }

  return {
    projectDefinition: projectDefinition as any,
    migrations: {
      models: modelMigrations,
      screens: screenMigrations,
      widgets: widgetMigrations,
    },
    generationPlan,
    preservedFiles,
    warnings,
  };
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
