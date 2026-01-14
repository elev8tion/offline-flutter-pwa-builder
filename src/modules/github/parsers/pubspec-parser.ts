import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface PubspecInfo {
  name: string;
  description: string;
  version: string;

  // SDK constraints
  flutter: {
    version: string;
    channel: 'stable' | 'beta' | 'dev' | 'unknown';
  };
  dart: {
    minVersion: string;
    maxVersion?: string;
  };

  // Dependency analysis
  dependencies: {
    // State management
    stateManagement: 'riverpod' | 'bloc' | 'provider' | 'getx' | 'mobx' | 'none';
    statePackages: string[];

    // Database
    database: 'drift' | 'sqflite' | 'hive' | 'isar' | 'none';
    databasePackages: string[];

    // Networking
    networking: 'dio' | 'http' | 'chopper' | 'retrofit' | 'none';
    networkPackages: string[];

    // Navigation
    navigation: 'go_router' | 'auto_route' | 'navigator' | 'none';
    navigationPackages: string[];

    // Code generation
    usesFreezed: boolean;
    usesJsonSerializable: boolean;
    usesBuildRunner: boolean;

    // All dependencies
    all: Record<string, string>;
    dev: Record<string, string>;
  };

  // Assets
  assets: string[];
  fonts: string[];
}

const STATE_MANAGEMENT_PACKAGES: Record<string, string[]> = {
  riverpod: ['flutter_riverpod', 'riverpod', 'hooks_riverpod'],
  bloc: ['flutter_bloc', 'bloc', 'hydrated_bloc'],
  provider: ['provider'],
  getx: ['get', 'getx'],
  mobx: ['flutter_mobx', 'mobx'],
};

const DATABASE_PACKAGES: Record<string, string[]> = {
  drift: ['drift', 'drift_flutter', 'moor', 'moor_flutter'],
  sqflite: ['sqflite'],
  hive: ['hive', 'hive_flutter'],
  isar: ['isar', 'isar_flutter_libs'],
};

const NETWORK_PACKAGES: Record<string, string[]> = {
  dio: ['dio'],
  http: ['http'],
  chopper: ['chopper'],
  retrofit: ['retrofit'],
};

const NAVIGATION_PACKAGES: Record<string, string[]> = {
  go_router: ['go_router'],
  auto_route: ['auto_route'],
};

export async function parsePubspec(projectPath: string): Promise<PubspecInfo> {
  const pubspecPath = path.join(projectPath, 'pubspec.yaml');

  if (!await fs.pathExists(pubspecPath)) {
    throw new Error(`pubspec.yaml not found at ${pubspecPath}`);
  }

  const content = await fs.readFile(pubspecPath, 'utf-8');
  const pubspec = yaml.load(content) as any;

  const dependencies = pubspec.dependencies || {};
  const devDependencies = pubspec.dev_dependencies || {};
  const allDeps = { ...dependencies, ...devDependencies };

  return {
    name: pubspec.name || 'unknown',
    description: pubspec.description || '',
    version: pubspec.version || '1.0.0',

    flutter: parseFlutterVersion(pubspec),
    dart: parseDartVersion(pubspec),

    dependencies: {
      stateManagement: detectPackageCategory(allDeps, STATE_MANAGEMENT_PACKAGES) as PubspecInfo['dependencies']['stateManagement'],
      statePackages: findMatchingPackages(allDeps, STATE_MANAGEMENT_PACKAGES),

      database: detectPackageCategory(allDeps, DATABASE_PACKAGES) as PubspecInfo['dependencies']['database'],
      databasePackages: findMatchingPackages(allDeps, DATABASE_PACKAGES),

      networking: detectPackageCategory(allDeps, NETWORK_PACKAGES) as PubspecInfo['dependencies']['networking'],
      networkPackages: findMatchingPackages(allDeps, NETWORK_PACKAGES),

      navigation: detectPackageCategory(allDeps, NAVIGATION_PACKAGES) as PubspecInfo['dependencies']['navigation'],
      navigationPackages: findMatchingPackages(allDeps, NAVIGATION_PACKAGES),

      usesFreezed: 'freezed' in allDeps || 'freezed_annotation' in allDeps,
      usesJsonSerializable: 'json_serializable' in allDeps || 'json_annotation' in allDeps,
      usesBuildRunner: 'build_runner' in allDeps,

      all: dependencies,
      dev: devDependencies,
    },

    assets: parseAssets(pubspec),
    fonts: parseFonts(pubspec),
  };
}

function parseFlutterVersion(pubspec: any): PubspecInfo['flutter'] {
  const env = pubspec.environment || {};
  const flutter = env.flutter || '>=3.0.0';

  // Extract minimum version
  const match = flutter.match(/>=?\s*([\d.]+)/);
  const version = match ? match[1] : '3.0.0';

  return {
    version,
    channel: 'stable',
  };
}

function parseDartVersion(pubspec: any): PubspecInfo['dart'] {
  const env = pubspec.environment || {};
  const sdk = env.sdk || '>=3.0.0 <4.0.0';

  const minMatch = sdk.match(/>=?\s*([\d.]+)/);
  const maxMatch = sdk.match(/<\s*([\d.]+)/);

  return {
    minVersion: minMatch ? minMatch[1] : '3.0.0',
    maxVersion: maxMatch ? maxMatch[1] : undefined,
  };
}

function detectPackageCategory(
  deps: Record<string, unknown>,
  categories: Record<string, string[]>
): string {
  for (const [category, packages] of Object.entries(categories)) {
    if (packages.some(pkg => pkg in deps)) {
      return category;
    }
  }
  return 'none';
}

function findMatchingPackages(
  deps: Record<string, unknown>,
  categories: Record<string, string[]>
): string[] {
  const allPackages = Object.values(categories).flat();
  return allPackages.filter(pkg => pkg in deps);
}

function parseAssets(pubspec: any): string[] {
  const flutter = pubspec.flutter || {};
  return flutter.assets || [];
}

function parseFonts(pubspec: any): string[] {
  const flutter = pubspec.flutter || {};
  const fonts = flutter.fonts || [];
  return fonts.map((f: any) => f.family).filter(Boolean);
}
