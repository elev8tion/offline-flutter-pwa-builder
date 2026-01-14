import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Generate main.dart with database initialization
 */
export async function generateMainDart(
  outputPath: string,
  appName: string,
  hasDrift: boolean
): Promise<void> {
  const libPath = path.join(outputPath, 'lib');
  await fs.ensureDir(libPath);

  const driftImports = hasDrift
    ? `import 'database/app_database.dart';`
    : '';

  const driftProvider = hasDrift
    ? `
    // Initialize database
    final database = AppDatabase();

    return Provider<AppDatabase>(
      create: (_) => database,
      dispose: (_, db) => db.close(),
      child: child,
    );`
    : 'return child;';

  const content = `
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
${driftImports}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return _DatabaseProvider(
      child: MaterialApp(
        title: '${appName}',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        home: const HomePage(),
      ),
    );
  }
}

class _DatabaseProvider extends StatelessWidget {
  final Widget child;

  const _DatabaseProvider({Key? key, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    ${driftProvider}
  }
}

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${appName}'),
      ),
      body: const Center(
        child: Text('Welcome to ${appName}!'),
      ),
    );
  }
}
`.trim();

  const filePath = path.join(libPath, 'main.dart');
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Generate pubspec.yaml with Drift dependencies
 */
export async function generatePubspecWithDrift(
  outputPath: string,
  appName: string,
  hasDrift: boolean
): Promise<void> {
  const pubspecPath = path.join(outputPath, 'pubspec.yaml');

  const driftDeps = hasDrift
    ? `
  drift: ^2.14.0
  sqlite3_flutter_libs: ^0.5.0
  path_provider: ^2.1.1
  path: ^1.8.3`
    : '';

  const driftDevDeps = hasDrift
    ? `
  drift_dev: ^2.14.0
  build_runner: ^2.4.6`
    : '';

  const content = `
name: ${appName}
description: A Flutter PWA with offline-first capabilities
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.1${driftDeps}

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0${driftDevDeps}

flutter:
  uses-material-design: true
`.trim();

  await fs.writeFile(pubspecPath, content, 'utf-8');
}

/**
 * Generate build.yaml for Drift code generation
 */
export async function generateBuildYaml(outputPath: string): Promise<void> {
  const content = `
targets:
  \$default:
    builders:
      drift_dev:
        enabled: true
        options:
          compact_query_methods: true
          skip_verification_code: false
          use_data_class_name_for_companions: true
          use_column_name_as_json_key_when_defined_in_moor_file: true
`.trim();

  const filePath = path.join(outputPath, 'build.yaml');
  await fs.writeFile(filePath, content, 'utf-8');
}
