import fs from 'fs-extra';
import path from 'path';
import { DriftTableSchema, DriftFieldMapping } from './drift-mapper.js';

/**
 * Generate Drift table class definition
 */
function generateTableClass(schema: DriftTableSchema): string {
  const fields = schema.fields.map(field => generateFieldDefinition(field)).join('\n  ');

  return `
class ${schema.dartClassName}Table extends Table {
  ${fields}

  @override
  String get tableName => '${schema.name}';
}
`.trim();
}

/**
 * Generate field definition for Drift table
 */
function generateFieldDefinition(field: DriftFieldMapping): string {
  const lines: string[] = [];

  // Choose appropriate column type
  let columnType: string;
  switch (field.sqlType) {
    case 'integer':
      columnType = 'IntColumn';
      break;
    case 'text':
      columnType = 'TextColumn';
      break;
    case 'real':
      columnType = 'RealColumn';
      break;
    case 'boolean':
      columnType = 'BoolColumn';
      break;
    case 'dateTime':
      columnType = 'DateTimeColumn';
      break;
    case 'blob':
      columnType = 'BlobColumn';
      break;
    default:
      columnType = 'TextColumn';
  }

  // Build column definition with constraints
  const constraints: string[] = [];
  if (field.primaryKey && field.autoIncrement) {
    constraints.push('autoIncrement: true');
  }
  if (!field.nullable && !field.primaryKey) {
    constraints.push('nullable: false');
  }
  if (field.unique) {
    constraints.push('unique: true');
  }
  if (field.defaultValue !== undefined) {
    const defaultVal = typeof field.defaultValue === 'string'
      ? `'${field.defaultValue}'`
      : field.defaultValue;
    constraints.push(`defaultValue: Constant(${defaultVal})`);
  }
  if (field.references) {
    constraints.push(`references: ${field.references.table}, '${field.references.column}'`);
  }

  const constraintsStr = constraints.length > 0 ? `(${constraints.join(', ')})` : '()';
  lines.push(`${columnType} get ${field.name} => ${columnType.toLowerCase().replace('column', '')}${constraintsStr};`);

  return lines.join('\n  ');
}

/**
 * Generate DAO class for a table
 */
function generateDaoClass(schema: DriftTableSchema): string {
  const className = schema.dartClassName;
  const tableName = schema.name;

  return `
@DriftAccessor(tables: [${className}Table])
class ${className}Dao extends DatabaseAccessor<AppDatabase> with _\$${className}DaoMixin {
  ${className}Dao(AppDatabase db) : super(db);

  // Get all ${tableName}s
  Future<List<${className}TableData>> getAll${className}s() => select(${tableName}Table).get();

  // Get ${tableName} by id
  Future<${className}TableData?> get${className}ById(int id) =>
      (select(${tableName}Table)..where((t) => t.id.equals(id))).getSingleOrNull();

  // Insert ${tableName}
  Future<int> insert${className}(${className}TableCompanion entry) =>
      into(${tableName}Table).insert(entry);

  // Update ${tableName}
  Future<bool> update${className}(${className}TableData entry) =>
      update(${tableName}Table).replace(entry);

  // Delete ${tableName}
  Future<int> delete${className}(int id) =>
      (delete(${tableName}Table)..where((t) => t.id.equals(id))).go();
}
`.trim();
}

/**
 * Generate complete app_database.dart file
 */
export async function generateDatabaseFile(
  schemas: DriftTableSchema[],
  outputPath: string
): Promise<void> {
  const libPath = path.join(outputPath, 'lib');
  const dbPath = path.join(libPath, 'database');
  await fs.ensureDir(dbPath);

  const tableClasses = schemas.map(generateTableClass).join('\n\n');
  const daoClasses = schemas.map(generateDaoClass).join('\n\n');
  const tableImports = schemas.map(s => `${s.dartClassName}Table`).join(', ');
  const daoGetters = schemas.map(s => {
    const name = s.dartClassName.charAt(0).toLowerCase() + s.dartClassName.slice(1);
    return `  ${s.dartClassName}Dao get ${name}Dao => ${s.dartClassName}Dao(this);`;
  }).join('\n');

  const content = `
// GENERATED CODE - DO NOT MODIFY BY HAND
import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/wasm.dart';
import 'package:drift/web.dart';
import 'package:sqlite3/wasm.dart';

part 'app_database.g.dart';

// Table Definitions
${tableClasses}

// Database Definition
@DriftDatabase(tables: [${tableImports}])
class AppDatabase extends _\$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // DAO Accessors
${daoGetters}

  // Initialize database with WASM/OPFS support for web
  static QueryExecutor _openConnection() {
    return LazyDatabase(() async {
      if (Platform.isAndroid || Platform.isIOS) {
        // Mobile: Use native SQLite
        final dbFolder = await getApplicationDocumentsDirectory();
        final file = File(path.join(dbFolder.path, 'app.db'));
        return NativeDatabase(file);
      } else {
        // Web: Use WASM with OPFS
        final db = await WasmDatabase.open(
          databaseName: 'app_db',
          sqlite3Uri: Uri.parse('sqlite3.wasm'),
          driftWorkerUri: Uri.parse('drift_worker.js'),
        );
        return db.resolvedExecutor;
      }
    });
  }
}

// DAO Classes
${daoClasses}
`.trim();

  const filePath = path.join(dbPath, 'app_database.dart');
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Generate WASM configuration files for web
 */
export async function generateWasmConfig(outputPath: string): Promise<void> {
  const webPath = path.join(outputPath, 'web');
  await fs.ensureDir(webPath);

  // Create sqlite3.wasm placeholder (actual file comes from drift package)
  const wasmReadme = `
# SQLite WASM Files

The \`sqlite3.wasm\` and \`drift_worker.js\` files are provided by the Drift package.

Run the following command to copy them to this directory:

\`\`\`bash
flutter pub run drift_dev wasm_setup
\`\`\`

This will copy the necessary WASM files from the Drift package to your web directory.
`.trim();

  await fs.writeFile(path.join(webPath, 'WASM_README.md'), wasmReadme, 'utf-8');
}

/**
 * Generate OPFS configuration
 */
export async function generateOpfsConfig(outputPath: string): Promise<void> {
  const webPath = path.join(outputPath, 'web');
  await fs.ensureDir(webPath);

  // Update index.html to enable OPFS headers
  const indexPath = path.join(webPath, 'index.html');
  let indexContent = '';

  if (await fs.pathExists(indexPath)) {
    indexContent = await fs.readFile(indexPath, 'utf-8');
  } else {
    indexContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>App</title></head><body><script src="main.dart.js"></script></body></html>`;
  }

  // Add COOP/COEP headers meta tags for OPFS
  if (!indexContent.includes('Cross-Origin-Opener-Policy')) {
    const metaTags = `
  <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin">
  <meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp">`;

    indexContent = indexContent.replace('</head>', `${metaTags}\n</head>`);
    await fs.writeFile(indexPath, indexContent, 'utf-8');
  }

  // Create headers file for local development
  const headersContent = `
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
`.trim();

  await fs.writeFile(path.join(webPath, '_headers'), headersContent, 'utf-8');
}
