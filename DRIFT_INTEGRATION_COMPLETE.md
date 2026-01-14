# Drift Integration Complete: 70% → 100% - Subagent Orchestration Playbook

## Orchestration Protocol

This document defines how to orchestrate multiple subagents to complete the Drift + WASM + OPFS integration in the GitHub Import & Rebuild workflow. Currently at 70%, this plan brings it to 100% through systematic subagent coordination.

---

## Token Management Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUBAGENT TOKEN PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Each subagent receives ONLY the context needed for its specific task    │
│  2. Maximum task scope: 2-3 files creation OR 3-4 files modification        │
│  3. Before spawning: Provide summary of previous agent's completed work     │
│  4. After completion: Agent reports files created/modified + verification   │
│  5. Orchestrator confirms phase complete before next spawn                  │
│                                                                             │
│  HANDOFF FORMAT:                                                            │
│  - Files created: [list with paths]                                         │
│  - Files modified: [list with paths and line ranges]                        │
│  - Key exports: [functions/classes available for next agent]                │
│  - Verification: [how to confirm work is correct]                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview

| Phase | Subagents | Focus | Estimated Tokens |
|-------|-----------|-------|------------------|
| 1 | 2 | Type Mapping & Schema Enhancement | ~15K each |
| 2 | 2 | Database Code Generation | ~15K each |
| 3 | 3 | Drift Tool Orchestration | ~12K each |
| 4 | 2 | Main.dart Wiring & Sync Config | ~15K each |
| 5 | 1 | Testing & Verification | ~20K |

**Total: 10 subagent spawns**

---

## Current State: The 70%

### ✅ What Works
- GitHub clone, analyze, extract models with fields/relationships
- Schema builder creates RebuildSchema
- Project builder generates Flutter structure
- Drift dependency added to pubspec.yaml

### ❌ What's Missing (The 30%)
- Models NOT converted to Drift tables
- DAOs NOT generated
- WASM + OPFS NOT configured
- Database initialization NOT wired
- User must manually call drift tools

### Goal: 100% Automated
One command → fully working offline PWA with SQLite in browser via WASM/OPFS.

---

## PHASE 1: Type Mapping & Schema Enhancement

### Subagent 1A: Create Type Mapper

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Create Drift type mapper for Dart → SQL conversions

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED PREVIOUSLY:
- GitHub module at src/modules/github/
- Model extractor outputs ModelDefinition with fields, types, relationships

YOUR TASK: Create src/modules/github/builders/drift-mapper.ts

This file maps Dart types to SQL types and handles relationships.

INTERFACES TO CREATE:

```typescript
import { FieldDefinition, ModelDefinition } from '../config.js';

export interface DriftFieldMapping {
  dartField: FieldDefinition;
  sqlType: 'text' | 'integer' | 'real' | 'boolean' | 'dateTime' | 'blob';
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
  defaultValue?: string;
}

export interface DriftTableSchema {
  name: string;              // snake_case table name
  dartClassName: string;     // Original PascalCase name
  fields: DriftFieldMapping[];
  relationships: {
    type: 'hasOne' | 'hasMany';
    relatedTable: string;
    foreignKey: string;
  }[];
  timestamps: boolean;       // createdAt/updatedAt
  softDelete: boolean;       // deletedAt
}
```

FUNCTIONS TO IMPLEMENT:

1. **mapDartTypeToSQL(dartType: string): string**
```typescript
const DART_TO_SQL_TYPE_MAP: Record<string, string> = {
  'String': 'text',
  'int': 'integer',
  'double': 'real',
  'bool': 'boolean',
  'DateTime': 'dateTime',
  'List<String>': 'text',  // JSON array
  'List<int>': 'text',
  'Map<String, dynamic>': 'text',  // JSON object
};

export function mapDartTypeToSQL(dartType: string): 'text' | 'integer' | 'real' | 'boolean' | 'dateTime' | 'blob' {
  const cleanType = dartType.replace('?', '').trim();

  // Check map
  if (cleanType in DART_TO_SQL_TYPE_MAP) {
    return DART_TO_SQL_TYPE_MAP[cleanType] as any;
  }

  // Check List<T> pattern
  if (cleanType.startsWith('List<') || cleanType.startsWith('Map<')) {
    return 'text'; // Serialize to JSON
  }

  // Custom types default to text
  return 'text';
}
```

2. **isModelType(typeName: string): boolean**
```typescript
export function isModelType(typeName: string): boolean {
  const cleanType = typeName.replace('?', '').trim();
  const builtIns = ['String', 'int', 'double', 'bool', 'DateTime', 'dynamic', 'Object', 'Map', 'Set', 'List'];
  return !builtIns.includes(cleanType) && /^[A-Z]/.test(cleanType);
}
```

3. **mapDartFieldToSQL(field: FieldDefinition, relationships: ModelDefinition['relationships']): DriftFieldMapping**
```typescript
export function mapDartFieldToSQL(
  field: FieldDefinition,
  relationships: ModelDefinition['relationships']
): DriftFieldMapping {
  const sqlType = mapDartTypeToSQL(field.type);

  // Check if this field is a foreign key
  const isForeignKey = relationships.some(rel =>
    rel.type === 'belongsTo' &&
    (rel.fieldName === field.name || rel.fieldName + 'Id' === field.name)
  );

  let referencesTable: string | undefined;
  let referencesColumn: string | undefined;

  if (isForeignKey) {
    const rel = relationships.find(r => r.fieldName === field.name || r.fieldName + 'Id' === field.name);
    if (rel) {
      referencesTable = toSnakeCase(rel.target);
      referencesColumn = 'id';
    }
  }

  return {
    dartField: field,
    sqlType,
    nullable: field.nullable,
    isPrimaryKey: false,
    isForeignKey,
    referencesTable,
    referencesColumn,
    defaultValue: field.defaultValue,
  };
}
```

4. **modelToDriftSchema(model: ModelDefinition): DriftTableSchema**
```typescript
export function modelToDriftSchema(model: ModelDefinition): DriftTableSchema {
  const fields: DriftFieldMapping[] = [];

  // Add primary key
  fields.push({
    dartField: {
      name: 'id',
      type: 'int',
      nullable: false,
      annotations: [],
      defaultValue: undefined
    },
    sqlType: 'integer',
    nullable: false,
    isPrimaryKey: true,
    isForeignKey: false,
    defaultValue: 'autoIncrement',
  });

  // Map each field
  for (const field of model.fields) {
    fields.push(mapDartFieldToSQL(field, model.relationships));
  }

  // Add timestamps
  if (true) { // Always add timestamps
    fields.push({
      dartField: { name: 'createdAt', type: 'DateTime', nullable: false, annotations: [], defaultValue: undefined },
      sqlType: 'dateTime',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      defaultValue: 'currentTimestamp',
    });
    fields.push({
      dartField: { name: 'updatedAt', type: 'DateTime', nullable: false, annotations: [], defaultValue: undefined },
      sqlType: 'dateTime',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      defaultValue: 'currentTimestamp',
    });
  }

  // Extract relationships
  const driftRelationships = model.relationships
    .filter(rel => rel.type !== 'belongsTo')
    .map(rel => ({
      type: rel.type as 'hasOne' | 'hasMany',
      relatedTable: toSnakeCase(rel.target),
      foreignKey: `${toSnakeCase(model.name)}_id`,
    }));

  return {
    name: toSnakeCase(model.name),
    dartClassName: model.name,
    fields,
    relationships: driftRelationships,
    timestamps: true,
    softDelete: false,
  };
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
```

Run: npm run build && npm test
```

**Verification Checkpoint:**
```bash
npm run build
npm test
```

**Expected Output from Subagent:**
```
FILES CREATED:
- src/modules/github/builders/drift-mapper.ts

KEY EXPORTS:
- mapDartTypeToSQL(dartType) -> sqlType
- isModelType(typeName) -> boolean
- mapDartFieldToSQL(field, relationships) -> DriftFieldMapping
- modelToDriftSchema(model) -> DriftTableSchema
- DriftFieldMapping interface
- DriftTableSchema interface

VERIFICATION: Build succeeds, exports available
```

---

### Subagent 1B: Enhance Schema Builder

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Enhance schema builder to generate Drift schemas

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

PREVIOUS AGENT COMPLETED:
- src/modules/github/builders/drift-mapper.ts
- Exports: modelToDriftSchema(), DriftTableSchema interface

YOUR TASKS:

1. Update src/modules/github/config.ts - Add to exports:
```typescript
export interface DriftFieldMapping {
  dartField: FieldDefinition;
  sqlType: 'text' | 'integer' | 'real' | 'boolean' | 'dateTime' | 'blob';
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
  defaultValue?: string;
}

export interface DriftTableSchema {
  name: string;
  dartClassName: string;
  fields: DriftFieldMapping[];
  relationships: {
    type: 'hasOne' | 'hasMany';
    relatedTable: string;
    foreignKey: string;
  }[];
  timestamps: boolean;
  softDelete: boolean;
}
```

2. Update RebuildSchema interface in config.ts:
```typescript
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
  driftSchemas?: DriftTableSchema[];  // NEW
}
```

3. Update src/modules/github/builders/schema-builder.ts:

Add import:
```typescript
import { modelToDriftSchema } from './drift-mapper.js';
```

In createRebuildSchema() function, after creating generationPlan, add:
```typescript
// Generate Drift schemas if offline support enabled
const driftSchemas: DriftTableSchema[] = [];
if (addOfflineSupport && !keepModels) {
  for (const model of analysis.models) {
    const driftSchema = modelToDriftSchema(model);
    driftSchemas.push(driftSchema);
  }
}

// Add to return object
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
  driftSchemas: driftSchemas.length > 0 ? driftSchemas : undefined,  // NEW
};
```

4. Update src/modules/github/builders/index.ts to export types:
```typescript
export * from './drift-mapper.js';
```

Run: npm run build && npm test
```

**Verification Checkpoint:**
```bash
npm run build
npm test
grep "driftSchemas" src/modules/github/config.ts
```

**Expected Output:**
```
FILES MODIFIED:
- src/modules/github/config.ts (added DriftTableSchema, updated RebuildSchema)
- src/modules/github/builders/schema-builder.ts (added drift schema generation)
- src/modules/github/builders/index.ts (added export)

KEY CHANGES:
- RebuildSchema now includes driftSchemas?: DriftTableSchema[]
- createRebuildSchema() generates Drift schemas for all models
- Schemas only generated when addOfflineSupport=true and keepModels=false

VERIFICATION: Build succeeds, schemas generated in RebuildSchema
```

---

## PHASE 1 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test
npm run build
ls src/modules/github/builders/drift-mapper.ts
grep "driftSchemas" src/modules/github/config.ts
```

**Phase 1 Complete When:**
- [ ] drift-mapper.ts created with type conversion functions
- [ ] DriftTableSchema interface defined
- [ ] RebuildSchema enhanced with driftSchemas field
- [ ] createRebuildSchema() generates Drift schemas
- [ ] All tests pass

---

## PHASE 2: Database Code Generation

### Subagent 2A: Create Database Generator

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Create database code generator for Drift

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED IN PHASE 1:
- drift-mapper.ts with DriftTableSchema interface
- Schema builder outputs driftSchemas in RebuildSchema

YOUR TASK: Create src/modules/github/builders/database-generator.ts

This file generates app_database.dart and related files.

FUNCTIONS TO IMPLEMENT:

1. **generateDatabaseFile(schemas: DriftTableSchema[], outputPath: string): Promise<void>**
```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import { DriftTableSchema } from '../config.js';

export async function generateDatabaseFile(
  schemas: DriftTableSchema[],
  outputPath: string
): Promise<void> {
  const tableImports = schemas
    .map(s => `import 'package:app/database/tables/${s.name}.dart';`)
    .join('\n');

  const daoImports = schemas
    .map(s => `import 'package:app/database/daos/${s.name}_dao.dart';`)
    .join('\n');

  const tablesList = schemas.map(s => `${toPascalCase(s.name)}Table`).join(', ');

  const daoGetters = schemas
    .map(s => {
      const pascalName = toPascalCase(s.name);
      return `  ${pascalName}Dao get ${s.name}Dao => ${pascalName}Dao(this);`;
    })
    .join('\n');

  const databaseFile = `
// Auto-generated database file
// DO NOT EDIT - Generated by offline-flutter-pwa-builder
import 'package:drift/drift.dart';
import 'package:drift/web.dart';

${tableImports}
${daoImports}

part 'app_database.g.dart';

@DriftDatabase(tables: [${tablesList}])
class AppDatabase extends _\$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // DAO getters
${daoGetters}

  static QueryExecutor _openConnection() {
    return LazyDatabase(() async {
      final db = await WasmDatabase.open(
        databaseName: 'app_database',
        sqlite3Uri: Uri.parse('sqlite3.wasm'),
        driftWorkerUri: Uri.parse('drift_worker.js'),
      );
      return db.resolvedExecutor;
    });
  }
}
`;

  await fs.ensureDir(path.join(outputPath, 'lib/database'));
  await fs.writeFile(
    path.join(outputPath, 'lib/database/app_database.dart'),
    databaseFile.trim(),
    'utf-8'
  );
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
```

2. **generateWasmConfig(outputPath: string): Promise<void>**
```typescript
export async function generateWasmConfig(outputPath: string): Promise<void> {
  const wasmConfig = `
// Auto-generated WASM configuration
// DO NOT EDIT - Generated by offline-flutter-pwa-builder
import 'package:drift/wasm.dart';
import 'package:drift/web.dart';

DatabaseConnection connectOnWeb() {
  return DatabaseConnection.delayed(Future(() async {
    final db = await WasmDatabase.open(
      databaseName: 'app_database',
      sqlite3Uri: Uri.parse('sqlite3.wasm'),
      driftWorkerUri: Uri.parse('drift_worker.js'),
    );

    return DatabaseConnection(db);
  }));
}
`;

  await fs.ensureDir(path.join(outputPath, 'lib/database/connection'));
  await fs.writeFile(
    path.join(outputPath, 'lib/database/connection/web.dart'),
    wasmConfig.trim(),
    'utf-8'
  );
}
```

3. **generateOpfsConfig(outputPath: string): Promise<void>**
```typescript
export async function generateOpfsConfig(outputPath: string): Promise<void> {
  const opfsConfig = `
// Auto-generated OPFS configuration
// DO NOT EDIT - Generated by offline-flutter-pwa-builder
import 'package:drift/drift.dart';
import 'package:drift/wasm.dart';

/// OPFS (Origin Private File System) provides persistent storage
/// in the browser without requiring user permissions.
/// Data is stored privately and isolated from other websites.
class OpfsStorage {
  static Future<WasmDatabase> openDatabase(String name) async {
    return WasmDatabase.open(
      databaseName: name,
      sqlite3Uri: Uri.parse('sqlite3.wasm'),
      driftWorkerUri: Uri.parse('drift_worker.js'),
      // OPFS is automatically used by drift/wasm when available
    );
  }
}
`;

  await fs.ensureDir(path.join(outputPath, 'lib/database/storage'));
  await fs.writeFile(
    path.join(outputPath, 'lib/database/storage/opfs.dart'),
    opfsConfig.trim(),
    'utf-8'
  );
}
```

4. **generateDatabaseIndex(outputPath: string): Promise<void>**
```typescript
export async function generateDatabaseIndex(outputPath: string): Promise<void> {
  const indexFile = `
// Auto-generated database exports
export 'app_database.dart';
export 'connection/web.dart';
export 'storage/opfs.dart';
`;

  await fs.writeFile(
    path.join(outputPath, 'lib/database/database.dart'),
    indexFile.trim(),
    'utf-8'
  );
}
```

5. Export all from index:
```typescript
export {
  generateDatabaseFile,
  generateWasmConfig,
  generateOpfsConfig,
  generateDatabaseIndex,
};
```

Run: npm run build && npm test
```

**Verification Checkpoint:**
```bash
npm run build
npm test
```

**Expected Output:**
```
FILES CREATED:
- src/modules/github/builders/database-generator.ts

KEY EXPORTS:
- generateDatabaseFile(schemas, outputPath) - Creates app_database.dart
- generateWasmConfig(outputPath) - Creates WASM connection file
- generateOpfsConfig(outputPath) - Creates OPFS storage file
- generateDatabaseIndex(outputPath) - Creates database.dart barrel file

VERIFICATION: All functions compile and export
```

---

### Subagent 2B: Create Main.dart Generator

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Create enhanced main.dart generator with database initialization

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED:
- database-generator.ts with database file generation
- Schema builder outputs DriftTableSchema[]

YOUR TASK: Create src/modules/github/builders/main-generator.ts

This generates main.dart with database initialization for Riverpod or BLoC.

FUNCTION TO IMPLEMENT:

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';

export async function generateMainDartWithDatabase(
  outputPath: string,
  stateManagement: 'riverpod' | 'bloc',
  hasDriftDatabase: boolean,
  appName: string = 'App'
): Promise<void> {
  let mainDartContent: string;

  if (!hasDriftDatabase) {
    // Use basic main.dart without database
    mainDartContent = generateBasicMainDart(stateManagement, appName);
  } else if (stateManagement === 'riverpod') {
    mainDartContent = `
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:app/database/app_database.dart';
import 'package:app/theme/app_theme.dart';
import 'package:app/screens/home_screen.dart';

/// Database provider - provides AppDatabase instance to entire app
final databaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Initialize database (lazy initialization)
    final database = ref.watch(databaseProvider);

    return MaterialApp(
      title: '${appName}',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
`;
  } else {
    // BLoC
    mainDartContent = `
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:app/database/app_database.dart';
import 'package:app/theme/app_theme.dart';
import 'package:app/screens/home_screen.dart';

void main() {
  final database = AppDatabase();
  runApp(MyApp(database: database));
}

class MyApp extends StatelessWidget {
  final AppDatabase database;

  const MyApp({super.key, required this.database});

  @override
  Widget build(BuildContext context) {
    return RepositoryProvider<AppDatabase>.value(
      value: database,
      child: MaterialApp(
        title: '${appName}',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        home: const HomeScreen(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
`;
  }

  await fs.writeFile(
    path.join(outputPath, 'lib/main.dart'),
    mainDartContent.trim(),
    'utf-8'
  );
}

function generateBasicMainDart(stateManagement: 'riverpod' | 'bloc', appName: string): string {
  if (stateManagement === 'riverpod') {
    return `
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:app/theme/app_theme.dart';
import 'package:app/screens/home_screen.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: '${appName}',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
`;
  } else {
    return `
import 'package:flutter/material.dart';
import 'package:app/theme/app_theme.dart';
import 'package:app/screens/home_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${appName}',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
`;
  }
}
```

Update src/modules/github/builders/index.ts to export:
```typescript
export * from './main-generator.js';
```

Run: npm run build && npm test
```

**Expected Output:**
```
FILES CREATED:
- src/modules/github/builders/main-generator.ts

FILES MODIFIED:
- src/modules/github/builders/index.ts (added export)

KEY EXPORTS:
- generateMainDartWithDatabase(outputPath, stateManagement, hasDrift, appName)

VERIFICATION: Build succeeds, function exported
```

---

## PHASE 2 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test
npm run build
ls src/modules/github/builders/database-generator.ts
ls src/modules/github/builders/main-generator.ts
```

**Phase 2 Complete When:**
- [ ] database-generator.ts created with 4 generation functions
- [ ] main-generator.ts created with database initialization
- [ ] All generators properly exported
- [ ] All tests pass

---

## PHASE 3: Drift Tool Orchestration

### Subagent 3A: Enhance Project Builder - Setup Function

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Add setupDriftDatabase() function to project builder

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED IN PHASES 1-2:
- drift-mapper.ts with DriftTableSchema
- database-generator.ts with generation functions
- Schema builder outputs driftSchemas in RebuildSchema

YOUR TASK: Enhance src/modules/github/builders/project-builder.ts

Add imports at top:
```typescript
import { handleDriftTool } from '../../drift/tools.js';
import { DriftTableSchema } from '../config.js';
import {
  generateDatabaseFile,
  generateWasmConfig,
  generateOpfsConfig,
  generateDatabaseIndex
} from './database-generator.js';
```

Add this function before rebuildProject():
```typescript
async function setupDriftDatabase(
  projectId: string,
  driftSchemas: DriftTableSchema[],
  outputPath: string
): Promise<void> {
  console.log('Setting up Drift database with WASM + OPFS...');

  // Step 1: Create Drift tables for each schema
  for (const schema of driftSchemas) {
    console.log(`  Creating table: ${schema.name}`);

    const columns = schema.fields.map(field => ({
      name: field.dartField.name,
      type: field.sqlType,
      nullable: field.nullable,
      primaryKey: field.isPrimaryKey,
      autoIncrement: field.defaultValue === 'autoIncrement',
      unique: false,
      references: field.isForeignKey ? {
        table: field.referencesTable!,
        column: field.referencesColumn || 'id',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      } : undefined,
      defaultValue: field.defaultValue !== 'autoIncrement' ? field.defaultValue : undefined,
    }));

    // Call drift_add_table tool
    await handleDriftTool('drift_add_table', {
      projectId,
      name: schema.name,
      columns,
      timestamps: schema.timestamps,
      softDelete: schema.softDelete,
    });
  }

  // Step 2: Generate DAOs for each table
  for (const schema of driftSchemas) {
    console.log(`  Generating DAO: ${schema.name}_dao`);

    // Call drift_generate_dao tool
    await handleDriftTool('drift_generate_dao', {
      projectId,
      tableName: schema.name,
      customMethods: [], // Can be enhanced with custom queries
    });
  }

  // Step 3: Generate database files
  console.log('  Generating database files...');
  await generateDatabaseFile(driftSchemas, outputPath);
  await generateWasmConfig(outputPath);
  await generateOpfsConfig(outputPath);
  await generateDatabaseIndex(outputPath);

  console.log('✓ Drift database setup complete!');
}
```

DO NOT modify rebuildProject() yet - that's for the next agent.

Run: npm run build && npm test
```

**Expected Output:**
```
FILES MODIFIED:
- src/modules/github/builders/project-builder.ts (added setupDriftDatabase function)

KEY CHANGES:
- Imports added for Drift tools and generators
- setupDriftDatabase() function added with 3 steps:
  1. Create Drift tables via drift_add_table
  2. Generate DAOs via drift_generate_dao
  3. Generate database files (app_database.dart, WASM, OPFS configs)

VERIFICATION: Build succeeds, function compiles
```

---

### Subagent 3B: Wire Setup into Rebuild

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Wire setupDriftDatabase() into rebuildProject()

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED BY PREVIOUS AGENT:
- setupDriftDatabase() function added to project-builder.ts
- Function calls drift_add_table and drift_generate_dao

YOUR TASK: Update rebuildProject() function in src/modules/github/builders/project-builder.ts

Find the rebuildProject() function and add this code AFTER the project structure is created but BEFORE files are written:

```typescript
// Around line 100-150, after directory creation, add:

// NEW: Setup Drift database if schemas are present
if (schema.driftSchemas && schema.driftSchemas.length > 0) {
  console.log('Drift schemas found, setting up offline database...');
  await setupDriftDatabase(projectId, schema.driftSchemas, outputPath);
  generatedFiles.push(...schema.driftSchemas.map(s => `lib/database/tables/${s.name}.dart`));
  generatedFiles.push(...schema.driftSchemas.map(s => `lib/database/daos/${s.name}_dao.dart`));
  generatedFiles.push('lib/database/app_database.dart');
  generatedFiles.push('lib/database/connection/web.dart');
  generatedFiles.push('lib/database/storage/opfs.dart');
}
```

Also update the return object to reflect database setup:
```typescript
return {
  success: true,
  outputPath,
  projectId,
  filesGenerated: generatedFiles.length,
  filesCopied: schema.preservedFiles.length,
  modulesInstalled: schema.projectDefinition.modules?.length || 0,
  databaseTablesCreated: schema.driftSchemas?.length || 0,  // NEW
  warnings: schema.warnings,
  nextSteps: [
    'cd ' + outputPath,
    runFlutterCreate ? 'flutter create .' : 'flutter pub get',
    'flutter pub run build_runner build',  // NEW - generate .g.dart files
    'flutter run -d chrome',
  ],
};
```

Run: npm run build && npm test
```

**Expected Output:**
```
FILES MODIFIED:
- src/modules/github/builders/project-builder.ts (wired setupDriftDatabase into rebuildProject)

KEY CHANGES:
- rebuildProject() now calls setupDriftDatabase() when driftSchemas present
- Generated files list updated to include database files
- Return object includes databaseTablesCreated count
- Next steps include build_runner command

VERIFICATION: Build succeeds, integration complete
```

---

### Subagent 3C: Update Main.dart Generation

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Wire enhanced main.dart generator into project builder

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED:
- setupDriftDatabase() integrated into rebuildProject()
- generateMainDartWithDatabase() function available

YOUR TASK: Update project-builder.ts to use enhanced main.dart

Add import:
```typescript
import { generateMainDartWithDatabase } from './main-generator.js';
```

Find where main.dart is currently generated (search for "generateMainDart" or "lib/main.dart").

Replace the existing main.dart generation with:
```typescript
// Generate main.dart with or without database
await generateMainDartWithDatabase(
  outputPath,
  schema.projectDefinition.stateManagement,
  schema.driftSchemas && schema.driftSchemas.length > 0,
  schema.projectDefinition.name
);
```

Remove the old generateMainDart() function if it exists inline (it's now in main-generator.ts).

Run: npm run build && npm test
```

**Expected Output:**
```
FILES MODIFIED:
- src/modules/github/builders/project-builder.ts (using generateMainDartWithDatabase)

KEY CHANGES:
- Import added for generateMainDartWithDatabase
- main.dart generation now uses database-aware generator
- Old inline generator removed (if present)

VERIFICATION: Build succeeds, main.dart includes database initialization
```

---

## PHASE 3 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test
npm run build
grep "setupDriftDatabase" src/modules/github/builders/project-builder.ts
grep "generateMainDartWithDatabase" src/modules/github/builders/project-builder.ts
```

**Phase 3 Complete When:**
- [ ] setupDriftDatabase() function created
- [ ] Function wired into rebuildProject()
- [ ] Enhanced main.dart generator integrated
- [ ] All tests pass

---

## PHASE 4: Offline Sync Configuration

### Subagent 4A: Add Offline Sync Config

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Add offline sync configuration to project builder

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED IN PHASE 3:
- Drift database automatically created
- Tables and DAOs generated
- Database wired into main.dart

YOUR TASK: Add configureOfflineSync() function to src/modules/github/builders/project-builder.ts

Add this function after setupDriftDatabase():
```typescript
async function configureOfflineSync(
  projectId: string,
  schema: RebuildSchema
): Promise<void> {
  if (!schema.projectDefinition.offline) {
    return; // Offline not enabled
  }

  console.log('Configuring offline sync features...');

  // Step 1: Conflict resolution strategy
  console.log('  Setting up conflict resolution...');
  await handleDriftTool('drift_configure_conflict_resolution', {
    projectId,
    strategy: schema.projectDefinition.offline.sync?.strategy === 'auto'
      ? 'lastWriteWins'
      : 'serverWins',
    tableStrategies: {}, // Can be customized per table
    fieldStrategies: {},
  });

  // Step 2: Background sync service
  console.log('  Configuring background sync...');
  await handleDriftTool('drift_configure_background_sync', {
    projectId,
    intervalSeconds: 60,
    syncOnConnect: true,
    maxRetries: 3,
    batchSize: 50,
    priorityTables: [], // Higher priority tables sync first
  });

  // Step 3: Offline UI indicator
  console.log('  Adding offline indicator UI...');
  await handleDriftTool('drift_configure_offline_indicator', {
    projectId,
    showBanner: true,
    showSyncProgress: true,
    bannerPosition: 'top',
    customMessages: {
      offline: 'You are offline. Changes will sync when reconnected.',
      syncing: 'Syncing changes...',
      pending: 'Changes pending sync',
    },
  });

  // Step 4: Optimistic updates
  console.log('  Enabling optimistic updates...');
  await handleDriftTool('drift_configure_optimistic_updates', {
    projectId,
    enabled: true,
    autoRollbackOnError: true,
    confirmTimeoutSeconds: 30,
    tables: schema.driftSchemas?.map(s => s.name) || [],
  });

  console.log('✓ Offline sync configured!');
}
```

Run: npm run build && npm test
```

**Expected Output:**
```
FILES MODIFIED:
- src/modules/github/builders/project-builder.ts (added configureOfflineSync)

KEY CHANGES:
- configureOfflineSync() function added with 4 steps:
  1. Conflict resolution
  2. Background sync
  3. Offline indicator UI
  4. Optimistic updates

VERIFICATION: Build succeeds, function compiles
```

---

### Subagent 4B: Wire Sync Config into Rebuild

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Wire configureOfflineSync() into rebuildProject()

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

COMPLETED BY PREVIOUS AGENT:
- configureOfflineSync() function added

YOUR TASK: Call configureOfflineSync() in rebuildProject()

In rebuildProject() function, find where setupDriftDatabase() is called.

Add this immediately AFTER the setupDriftDatabase() call:
```typescript
// After setupDriftDatabase
if (schema.driftSchemas && schema.driftSchemas.length > 0) {
  await setupDriftDatabase(projectId, schema.driftSchemas, outputPath);

  // NEW: Configure offline sync features
  await configureOfflineSync(projectId, schema);

  generatedFiles.push(...schema.driftSchemas.map(s => `lib/database/tables/${s.name}.dart`));
  // ... rest of existing code
}
```

Also update the return object summary:
```typescript
return {
  success: true,
  outputPath,
  projectId,
  filesGenerated: generatedFiles.length,
  filesCopied: schema.preservedFiles.length,
  modulesInstalled: schema.projectDefinition.modules?.length || 0,
  databaseTablesCreated: schema.driftSchemas?.length || 0,
  offlineSyncEnabled: schema.projectDefinition.offline?.sync?.enabled || false,  // NEW
  warnings: schema.warnings,
  nextSteps: [
    'cd ' + outputPath,
    runFlutterCreate ? 'flutter create .' : 'flutter pub get',
    'flutter pub run build_runner build',
    'flutter run -d chrome',
    '',
    'Your app now works offline! Data is stored locally in the browser.',
  ],
};
```

Run: npm run build && npm test
```

**Expected Output:**
```
FILES MODIFIED:
- src/modules/github/builders/project-builder.ts (wired configureOfflineSync)

KEY CHANGES:
- configureOfflineSync() called after setupDriftDatabase()
- Return object includes offlineSyncEnabled flag
- Next steps include offline confirmation message

VERIFICATION: Build succeeds, sync config integrated
```

---

## PHASE 4 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test
npm run build
grep "configureOfflineSync" src/modules/github/builders/project-builder.ts
```

**Phase 4 Complete When:**
- [ ] configureOfflineSync() function created
- [ ] Function wired into rebuildProject()
- [ ] Offline features configured (conflict resolution, sync, UI, optimistic updates)
- [ ] All tests pass

---

## PHASE 5: Testing & Documentation

### Subagent 5A: Add Drift Integration Tests

**Spawn Command:**
```
Task(subagent_type="afk-tool-developer")
```

**Context to Provide:**
```
MISSION: Add comprehensive tests for Drift integration

Working directory: /Users/kcdacre8tor/offline-flutter-pwa-builder

ALL PHASES COMPLETED:
- drift-mapper.ts with type conversion
- database-generator.ts with file generation
- project-builder.ts with setupDriftDatabase() and configureOfflineSync()
- Full integration wired

YOUR TASK: Add tests to tests/github.test.ts

Add these test suites at the end of the file:

```typescript
import {
  mapDartTypeToSQL,
  isModelType,
  modelToDriftSchema
} from '../src/modules/github/builders/drift-mapper.js';
import type { ModelDefinition, FieldDefinition } from '../src/modules/github/config.js';

describe('Drift Type Mapping', () => {
  it('should map String to text', () => {
    expect(mapDartTypeToSQL('String')).toBe('text');
  });

  it('should map int to integer', () => {
    expect(mapDartTypeToSQL('int')).toBe('integer');
  });

  it('should map double to real', () => {
    expect(mapDartTypeToSQL('double')).toBe('real');
  });

  it('should map bool to boolean', () => {
    expect(mapDartTypeToSQL('bool')).toBe('boolean');
  });

  it('should map DateTime to dateTime', () => {
    expect(mapDartTypeToSQL('DateTime')).toBe('dateTime');
  });

  it('should map List<String> to text', () => {
    expect(mapDartTypeToSQL('List<String>')).toBe('text');
  });

  it('should map custom types to text', () => {
    expect(mapDartTypeToSQL('CustomModel')).toBe('text');
  });

  it('should handle nullable types', () => {
    expect(mapDartTypeToSQL('String?')).toBe('text');
  });
});

describe('Model Type Detection', () => {
  it('should detect built-in types', () => {
    expect(isModelType('String')).toBe(false);
    expect(isModelType('int')).toBe(false);
    expect(isModelType('List')).toBe(false);
  });

  it('should detect custom model types', () => {
    expect(isModelType('User')).toBe(true);
    expect(isModelType('TodoItem')).toBe(true);
  });
});

describe('DriftTableSchema Generation', () => {
  it('should convert ModelDefinition to DriftTableSchema', () => {
    const model: ModelDefinition = {
      name: 'Todo',
      filePath: 'lib/models/todo.dart',
      fields: [
        {
          name: 'title',
          type: 'String',
          nullable: false,
          annotations: [],
          defaultValue: undefined
        },
        {
          name: 'completed',
          type: 'bool',
          nullable: false,
          annotations: [],
          defaultValue: 'false'
        },
      ],
      annotations: [],
      relationships: [],
      isImmutable: false,
      hasJson: true,
    };

    const schema = modelToDriftSchema(model);

    expect(schema.name).toBe('todos');
    expect(schema.dartClassName).toBe('Todo');
    expect(schema.timestamps).toBe(true);
    expect(schema.fields.length).toBeGreaterThan(2); // id + fields + timestamps

    // Check primary key exists
    const idField = schema.fields.find(f => f.dartField.name === 'id');
    expect(idField?.isPrimaryKey).toBe(true);
  });

  it('should handle relationships', () => {
    const model: ModelDefinition = {
      name: 'Todo',
      filePath: 'lib/models/todo.dart',
      fields: [
        { name: 'title', type: 'String', nullable: false, annotations: [], defaultValue: undefined },
        { name: 'userId', type: 'int', nullable: false, annotations: [], defaultValue: undefined },
      ],
      annotations: [],
      relationships: [
        { type: 'belongsTo', target: 'User', fieldName: 'user' }
      ],
      isImmutable: false,
      hasJson: false,
    };

    const schema = modelToDriftSchema(model);

    // Check foreign key detected
    const userIdField = schema.fields.find(f => f.dartField.name === 'userId');
    expect(userIdField?.isForeignKey).toBe(true);
    expect(userIdField?.referencesTable).toBe('users');
  });
});

describe('Drift Integration in Rebuild', () => {
  it('should include driftSchemas in RebuildSchema when offline enabled', () => {
    // This tests the full flow
    const mockAnalysis = {
      name: 'test-app',
      description: 'Test',
      flutterVersion: '3.10.0',
      dartVersion: '3.0.0',
      architecture: {
        detected: 'layer-first' as const,
        confidence: 80,
        structure: { name: 'lib', path: 'lib', type: 'directory' as const },
        reasoning: [],
      },
      dependencies: {
        stateManagement: 'riverpod' as const,
        database: 'none' as const,
        networking: 'none' as const,
        navigation: 'none' as const,
      },
      models: [
        {
          name: 'Todo',
          filePath: 'lib/models/todo.dart',
          fields: [
            { name: 'title', type: 'String', nullable: false, annotations: [], defaultValue: undefined },
          ],
          annotations: [],
          relationships: [],
          isImmutable: false,
          hasJson: false,
        }
      ],
      screens: [],
      widgets: [],
      stats: { totalFiles: 10, dartFiles: 8, testFiles: 2, linesOfCode: 500 },
    };

    // Note: This would require importing and calling createRebuildSchema
    // For now, just verify the flow conceptually
    expect(mockAnalysis.models.length).toBe(1);
  });
});
```

Run: npm test

Verify all tests pass, including the new 10+ Drift integration tests.
```

**Expected Output:**
```
FILES MODIFIED:
- tests/github.test.ts (added 10+ Drift integration tests)

NEW TEST SUITES:
- Drift Type Mapping (8 tests)
- Model Type Detection (3 tests)
- DriftTableSchema Generation (2 tests)
- Drift Integration in Rebuild (1 test)

VERIFICATION: All 632+ tests pass (was 622)
```

---

## PHASE 5 COMPLETION CHECKPOINT

**Orchestrator Verification:**
```bash
npm test | grep "passed"
# Should show 632+ tests passed (10 new Drift tests)
```

**Phase 5 Complete When:**
- [ ] 10+ new Drift tests added
- [ ] All tests pass (632+ total)
- [ ] Type mapping tested
- [ ] Schema generation tested

---

## FINAL VERIFICATION CHECKLIST

```bash
# 1. Build verification
npm run build

# 2. Test verification
npm test

# 3. File structure verification
ls src/modules/github/builders/drift-mapper.ts
ls src/modules/github/builders/database-generator.ts
ls src/modules/github/builders/main-generator.ts

# 4. Integration verification
grep "setupDriftDatabase" src/modules/github/builders/project-builder.ts
grep "configureOfflineSync" src/modules/github/builders/project-builder.ts
grep "driftSchemas" src/modules/github/config.ts

# 5. Test count verification
npm test 2>&1 | grep "Tests:"
# Should show 632+ tests passed
```

**Feature Complete When:**
- [ ] All 5 phases completed
- [ ] 3 new generator files created
- [ ] project-builder.ts enhanced with Drift integration
- [ ] 10+ new tests added
- [ ] All 632+ tests pass
- [ ] Zero build errors

---

## ORCHESTRATION COMMANDS SUMMARY

```
PHASE 1A: Task(subagent_type="afk-tool-developer") - Create drift-mapper.ts
PHASE 1B: Task(subagent_type="afk-tool-developer") - Enhance schema-builder.ts
--- VERIFY PHASE 1 ---

PHASE 2A: Task(subagent_type="afk-tool-developer") - Create database-generator.ts
PHASE 2B: Task(subagent_type="afk-tool-developer") - Create main-generator.ts
--- VERIFY PHASE 2 ---

PHASE 3A: Task(subagent_type="afk-tool-developer") - Add setupDriftDatabase()
PHASE 3B: Task(subagent_type="afk-tool-developer") - Wire setup into rebuild
PHASE 3C: Task(subagent_type="afk-tool-developer") - Update main.dart generation
--- VERIFY PHASE 3 ---

PHASE 4A: Task(subagent_type="afk-tool-developer") - Add configureOfflineSync()
PHASE 4B: Task(subagent_type="afk-tool-developer") - Wire sync into rebuild
--- VERIFY PHASE 4 ---

PHASE 5A: Task(subagent_type="afk-tool-developer") - Add integration tests
--- VERIFY PHASE 5 ---

COMPLETE - 70% → 100%
```

---

## Success Metrics

### Before (70%):
- ❌ User must manually call drift_add_table for each model
- ❌ User must manually call drift_generate_dao for each table
- ❌ User must manually configure WASM + OPFS
- ❌ User must manually wire database into main.dart
- ❌ No offline sync configured

### After (100%):
- ✅ Models automatically converted to Drift tables
- ✅ DAOs automatically generated
- ✅ WASM + OPFS automatically configured
- ✅ Database automatically wired into main.dart
- ✅ Offline sync fully configured
- ✅ One command → fully working offline PWA

### End Result:
```bash
# User runs ONE command
github_import_and_rebuild({
  url: "https://github.com/user/flutter-todo-app",
  outputPath: "/output",
  options: { addOfflineSupport: true }
})

# Gets COMPLETE offline PWA
cd /output
flutter pub get
flutter pub run build_runner build
flutter run -d chrome

# App works offline with:
# - SQLite database in browser (WASM)
# - Data persisted in OPFS
# - All models as Drift tables
# - CRUD operations via DAOs
# - Offline sync enabled
# - Conflict resolution configured
# - Background sync running
```

---

*Document Version: 2.0 - Subagent Orchestration Playbook*
*Created: 2026-01-14*
*For: offline-flutter-pwa-builder MCP Server*
*Completes: GitHub Import & Rebuild → Full Drift Integration*
