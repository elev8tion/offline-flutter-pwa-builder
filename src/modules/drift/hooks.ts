/**
 * Drift Module Hooks
 *
 * Lifecycle hooks for the Drift module
 */

import type {
  HookContext,
  GeneratedFile,
  ModuleHooks,
} from "../../core/types.js";
import {
  DriftConfig,
  DEFAULT_DRIFT_CONFIG,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  columnTypeToDart,
  columnTypeToDrift,
} from "./config.js";

// ============================================================================
// HANDLEBARS HELPERS FOR DRIFT TEMPLATES
// ============================================================================

export function registerDriftHelpers(handlebars: typeof import("handlebars")): void {
  // Convert to Drift column type
  handlebars.registerHelper("driftType", (type: string) => columnTypeToDrift(type as any));

  // Drift column type call
  handlebars.registerHelper("driftTypeCall", (type: string) => {
    switch (type) {
      case "integer":
        return "integer";
      case "text":
        return "text";
      case "real":
        return "real";
      case "blob":
        return "blob";
      case "boolean":
        return "boolean";
      case "dateTime":
        return "dateTime";
      default:
        return "text";
    }
  });

  // Get primary key type for a table
  handlebars.registerHelper("primaryKeyType", (table: any) => {
    const pkColumn = table.columns?.find((c: any) => c.primaryKey);
    if (pkColumn) {
      return columnTypeToDart(pkColumn.type);
    }
    return "int";
  });

  // Get primary key column name for a table
  handlebars.registerHelper("primaryKeyColumn", (table: any) => {
    const pkColumn = table.columns?.find((c: any) => c.primaryKey);
    if (pkColumn) {
      return toCamelCase(pkColumn.name);
    }
    return "id";
  });
}

// ============================================================================
// MODULE HOOKS IMPLEMENTATION
// ============================================================================

/**
 * Get drift config from project modules
 */
function getDriftConfig(ctx: HookContext): DriftConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "drift");
  return {
    ...DEFAULT_DRIFT_CONFIG,
    ...(moduleConfig?.config as Partial<DriftConfig> ?? {}),
  };
}

export const driftHooks: ModuleHooks = {
  /**
   * Called when the module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getDriftConfig(ctx);
    console.log(`[Drift] Module installed with database: ${config.databaseName}`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getDriftConfig(ctx);

    // Validate config
    if (!config.databaseName) {
      throw new Error("[Drift] Database name is required");
    }

    if (config.encryption && !config.encryptionKeyStrategy) {
      throw new Error("[Drift] Encryption key strategy is required when encryption is enabled");
    }

    // Ensure at least one table exists
    if (config.tables.length === 0) {
      console.warn("[Drift] No tables defined. Add tables using drift_add_table");
    }
  },

  /**
   * Main code generation hook
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getDriftConfig(ctx);
    const files: GeneratedFile[] = [];

    // 1. Generate main database file
    files.push(generateDatabaseFile(config));

    // 2. Generate table files
    for (const table of config.tables) {
      files.push(generateTableFile(config, table));
      files.push(generateDaoFile(config, table));
    }

    // 3. Generate web database helper (if web target)
    if (config.webWorker) {
      files.push(generateWebDatabaseFile(config));
    }

    // 4. Generate native database helper
    files.push(generateNativeDatabaseFile(config));

    // 5. Generate key manager (if encryption enabled)
    if (config.encryption) {
      files.push(generateKeyManagerFile(config));
    }

    // 6. Generate sync queue (if enabled)
    if (ctx.project.offline.sync?.enabled) {
      files.push(generateSyncQueueFile(config));
    }

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getDriftConfig(ctx);

    console.log(`[Drift] Generated ${config.tables.length} tables`);
    console.log(`[Drift] Run 'dart run build_runner build' to generate .g.dart files`);
  },

  /**
   * Called before build
   */
  beforeBuild: async (_ctx: HookContext): Promise<void> => {
    // Could run build_runner here
    console.log("[Drift] Preparing for build...");
  },

  /**
   * Called after build
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Drift] Build completed");
  },
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function generateDatabaseFile(config: DriftConfig): GeneratedFile {
  const imports: string[] = [
    "import 'dart:io';",
    "",
    "import 'package:drift/drift.dart';",
  ];

  if (config.webWorker) {
    imports.push("import 'package:drift/wasm.dart';");
  }

  if (config.encryption) {
    imports.push("import 'package:drift/native.dart' as native;");
    imports.push("import 'package:sqlcipher_flutter_libs/sqlcipher_flutter_libs.dart';");
  }

  imports.push(
    "import 'package:flutter/foundation.dart' show kIsWeb;",
    "import 'package:path_provider/path_provider.dart';",
    "import 'package:path/path.dart' as p;",
    ""
  );

  // Add part directives for tables and DAOs
  for (const table of config.tables) {
    imports.push(`part '${toSnakeCase(table.name)}_table.dart';`);
  }
  for (const table of config.tables) {
    imports.push(`part '${toSnakeCase(table.name)}_dao.dart';`);
  }
  imports.push(`part '${toSnakeCase(config.databaseName)}.g.dart';`);

  const tableNames = config.tables.map((t) => `${toPascalCase(t.name)}Table`).join(", ");
  const daoNames = config.tables.map((t) => `${toPascalCase(t.name)}Dao`).join(", ");

  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Database: ${config.databaseName}
// Schema Version: ${config.schemaVersion}

${imports.join("\n")}

@DriftDatabase(
  tables: [${tableNames}],
  daos: [${daoNames}],
)
class ${toPascalCase(config.databaseName)} extends _$${toPascalCase(config.databaseName)} {
  ${toPascalCase(config.databaseName)}() : super(_openConnection());

  ${toPascalCase(config.databaseName)}.forTesting(super.e);

  @override
  int get schemaVersion => ${config.schemaVersion};

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (m) async {
        await m.createAll();
      },
      onUpgrade: (m, from, to) async {
        // Add migration logic here
        await m.createAll();
      },
      beforeOpen: (details) async {
        // Enable foreign keys
        await customStatement('PRAGMA foreign_keys = ON');
      },
    );
  }
}

QueryExecutor _openConnection() {
  if (kIsWeb) {
    return _openWebConnection();
  } else {
    return _openNativeConnection();
  }
}

${
  config.webWorker
    ? `QueryExecutor _openWebConnection() {
  return DatabaseConnection.delayed(Future(() async {
    final result = await WasmDatabase.open(
      databaseName: '${config.databaseName}',
      sqlite3Uri: Uri.parse('sqlite3.wasm'),
      driftWorkerUri: Uri.parse('drift_worker.js'),
    );

    if (result.missingFeatures.isNotEmpty) {
      debugPrint('Missing features: \${result.missingFeatures}');
    }

    return result.resolvedExecutor;
  }));
}`
    : `QueryExecutor _openWebConnection() {
  throw UnsupportedError('Web support requires webWorker to be enabled');
}`
}

QueryExecutor _openNativeConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, '${config.databaseName}.db'));
${
  config.encryption
    ? `    // SQLCipher for encryption
    return native.NativeDatabase.createInBackground(
      file,
      setup: (rawDb) {
        rawDb.execute("PRAGMA key = '\${_getEncryptionKey()}'");
      },
    );`
    : "    return NativeDatabase.createInBackground(file);"
}
  });
}
${
  config.encryption
    ? `
String _getEncryptionKey() {
  // TODO: Use KeyManager for production
  return 'your-secure-key-here';
}`
    : ""
}
`;

  return {
    path: `lib/core/database/${toSnakeCase(config.databaseName)}.dart`,
    content,
  };
}

function generateTableFile(config: DriftConfig, table: any): GeneratedFile {
  const columns: string[] = [];

  for (const col of table.columns) {
    let colDef = `  ${columnTypeToDrift(col.type)} get ${toCamelCase(col.name)} => `;

    if (col.primaryKey && col.autoIncrement) {
      colDef += `${col.type === "integer" ? "integer" : "text"}().autoIncrement()();`;
    } else {
      colDef += `${col.type === "integer" ? "integer" : col.type === "text" ? "text" : col.type === "real" ? "real" : col.type === "boolean" ? "boolean" : col.type === "dateTime" ? "dateTime" : "blob"}()`;

      if (col.nullable) colDef += ".nullable()";
      if (col.unique) colDef += ".unique()";
      if (col.defaultValue !== undefined) {
        colDef += `.withDefault(const Constant(${JSON.stringify(col.defaultValue)}))`;
      }
      if (col.references) {
        colDef += `.references(${toPascalCase(col.references.table)}Table, #${toCamelCase(col.references.column)}`;
        if (col.references.onDelete) {
          colDef += `, onDelete: KeyAction.${col.references.onDelete}`;
        }
        colDef += ")";
      }
      colDef += "();";
    }

    columns.push(colDef);
  }

  // Add timestamp columns if enabled
  if (table.timestamps) {
    columns.push("  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();");
    columns.push("  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();");
  }

  // Add soft delete column if enabled
  if (table.softDelete) {
    columns.push("  DateTimeColumn get deletedAt => dateTime().nullable()();");
  }

  // Find primary key column
  const pkColumn = table.columns.find((c: any) => c.primaryKey);
  const pkName = pkColumn ? toCamelCase(pkColumn.name) : "id";

  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Table: ${table.name}

part of '${toSnakeCase(config.databaseName)}.dart';

/// ${toPascalCase(table.name)} table
@DataClassName('${toPascalCase(table.name)}')
class ${toPascalCase(table.name)}Table extends Table {
${columns.join("\n")}

  @override
  Set<Column> get primaryKey => {${pkName}};
}
`;

  return {
    path: `lib/core/database/${toSnakeCase(table.name)}_table.dart`,
    content,
  };
}

function generateDaoFile(config: DriftConfig, table: any): GeneratedFile {
  const tablePascal = toPascalCase(table.name);
  const tableCamel = toCamelCase(table.name);

  // Find primary key
  const pkColumn = table.columns.find((c: any) => c.primaryKey);
  const pkName = pkColumn ? toCamelCase(pkColumn.name) : "id";
  const pkType = pkColumn ? columnTypeToDart(pkColumn.type) : "int";

  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// DAO: ${tablePascal}Dao

part of '${toSnakeCase(config.databaseName)}.dart';

@DriftAccessor(tables: [${tablePascal}Table])
class ${tablePascal}Dao extends DatabaseAccessor<${toPascalCase(config.databaseName)}> with _$${tablePascal}DaoMixin {
  ${tablePascal}Dao(super.db);

  /// Get all ${table.name} entries
  Future<List<${tablePascal}>> getAll() {
${
  table.softDelete
    ? `    return (select(${tableCamel}Table)
      ..where((t) => t.deletedAt.isNull()))
      .get();`
    : `    return select(${tableCamel}Table).get();`
}
  }

  /// Watch all ${table.name} entries
  Stream<List<${tablePascal}>> watchAll() {
${
  table.softDelete
    ? `    return (select(${tableCamel}Table)
      ..where((t) => t.deletedAt.isNull()))
      .watch();`
    : `    return select(${tableCamel}Table).watch();`
}
  }

  /// Get ${table.name} by ID
  Future<${tablePascal}?> getById(${pkType} id) {
    return (select(${tableCamel}Table)
      ..where((t) => t.${pkName}.equals(id)))
      .getSingleOrNull();
  }

  /// Watch ${table.name} by ID
  Stream<${tablePascal}?> watchById(${pkType} id) {
    return (select(${tableCamel}Table)
      ..where((t) => t.${pkName}.equals(id)))
      .watchSingleOrNull();
  }

  /// Insert a new ${table.name}
  Future<int> insertOne(${tablePascal}TableCompanion entry) {
    return into(${tableCamel}Table).insert(entry);
  }

  /// Insert or replace a ${table.name}
  Future<int> upsertOne(${tablePascal}TableCompanion entry) {
    return into(${tableCamel}Table).insertOnConflictUpdate(entry);
  }

  /// Update a ${table.name}
  Future<bool> updateOne(${tablePascal} entry) {
${
  table.timestamps
    ? `    final updated = entry.copyWith(updatedAt: DateTime.now());
    return update(${tableCamel}Table).replace(updated);`
    : `    return update(${tableCamel}Table).replace(entry);`
}
  }

  /// Delete a ${table.name} by ID
${
  table.softDelete
    ? `  Future<int> deleteById(${pkType} id) {
    return (update(${tableCamel}Table)
      ..where((t) => t.${pkName}.equals(id)))
      .write(${tablePascal}TableCompanion(
        deletedAt: Value(DateTime.now()),
      ));
  }

  /// Hard delete a ${table.name} by ID (permanently)
  Future<int> hardDeleteById(${pkType} id) {
    return (delete(${tableCamel}Table)
      ..where((t) => t.${pkName}.equals(id)))
      .go();
  }

  /// Restore a soft-deleted ${table.name}
  Future<int> restoreById(${pkType} id) {
    return (update(${tableCamel}Table)
      ..where((t) => t.${pkName}.equals(id)))
      .write(const ${tablePascal}TableCompanion(
        deletedAt: Value(null),
      ));
  }`
    : `  Future<int> deleteById(${pkType} id) {
    return (delete(${tableCamel}Table)
      ..where((t) => t.${pkName}.equals(id)))
      .go();
  }`
}

  /// Delete all ${table.name} entries
${
  table.softDelete
    ? `  Future<int> deleteAll() {
    return update(${tableCamel}Table).write(
      ${tablePascal}TableCompanion(
        deletedAt: Value(DateTime.now()),
      ),
    );
  }`
    : `  Future<int> deleteAll() {
    return delete(${tableCamel}Table).go();
  }`
}

  /// Count all ${table.name} entries
  Future<int> count() async {
    final query = selectOnly(${tableCamel}Table)
      ..addColumns([${tableCamel}Table.${pkName}.count()]);
${table.softDelete ? `    query.where(${tableCamel}Table.deletedAt.isNull());` : ""}
    final result = await query.getSingle();
    return result.read(${tableCamel}Table.${pkName}.count()) ?? 0;
  }
}
`;

  return {
    path: `lib/core/database/${toSnakeCase(table.name)}_dao.dart`,
    content,
  };
}

function generateWebDatabaseFile(_config: DriftConfig): GeneratedFile {
  return {
    path: "lib/core/database/web_database.dart",
    content: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Web Database Connection

import 'package:drift/wasm.dart';

/// Opens a database connection for web platforms using WASM and OPFS
Future<WasmDatabaseResult> openWebDatabase({
  required String databaseName,
  String sqlite3Uri = 'sqlite3.wasm',
  String driftWorkerUri = 'drift_worker.js',
}) async {
  return await WasmDatabase.open(
    databaseName: databaseName,
    sqlite3Uri: Uri.parse(sqlite3Uri),
    driftWorkerUri: Uri.parse(driftWorkerUri),
  );
}

/// Check if the current browser supports all required features
class WebDatabaseSupport {
  final bool supportsIndexedDb;
  final bool supportsOpfs;
  final bool supportsSharedArrayBuffer;
  final bool supportsWasm;
  final List<String> missingFeatures;

  const WebDatabaseSupport({
    required this.supportsIndexedDb,
    required this.supportsOpfs,
    required this.supportsSharedArrayBuffer,
    required this.supportsWasm,
    required this.missingFeatures,
  });

  bool get isFullySupported => missingFeatures.isEmpty;

  String get recommendedStorage {
    if (supportsOpfs && supportsSharedArrayBuffer) {
      return 'opfs';
    } else if (supportsIndexedDb) {
      return 'indexedDb';
    } else {
      return 'memory';
    }
  }
}
`,
  };
}

function generateNativeDatabaseFile(config: DriftConfig): GeneratedFile {
  return {
    path: "lib/core/database/native_database.dart",
    content: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Native Database Connection

import 'dart:io';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
${config.encryption ? "import 'package:sqlcipher_flutter_libs/sqlcipher_flutter_libs.dart';" : ""}

/// Opens a database connection for native platforms (iOS, Android, Desktop)
Future<NativeDatabase> openNativeDatabase({
  required String databaseName,
${config.encryption ? "  String? encryptionKey," : ""}
  bool logStatements = false,
}) async {
  final dbFolder = await getApplicationDocumentsDirectory();
  final file = File(p.join(dbFolder.path, '\$databaseName.db'));

${
  config.encryption
    ? `  return NativeDatabase.createInBackground(
    file,
    logStatements: logStatements,
    setup: (rawDb) {
      if (encryptionKey != null) {
        rawDb.execute("PRAGMA key = '\$encryptionKey'");
      }
    },
  );`
    : `  return NativeDatabase.createInBackground(
    file,
    logStatements: logStatements,
  );`
}
}

/// Get the database file path
Future<String> getDatabasePath(String databaseName) async {
  final dbFolder = await getApplicationDocumentsDirectory();
  return p.join(dbFolder.path, '\$databaseName.db');
}

/// Check if database file exists
Future<bool> databaseExists(String databaseName) async {
  final path = await getDatabasePath(databaseName);
  return File(path).exists();
}

/// Delete database file (use with caution!)
Future<void> deleteDatabase(String databaseName) async {
  final path = await getDatabasePath(databaseName);
  final file = File(path);
  if (await file.exists()) {
    await file.delete();
  }
}

/// Get database file size in bytes
Future<int> getDatabaseSize(String databaseName) async {
  final path = await getDatabasePath(databaseName);
  final file = File(path);
  if (await file.exists()) {
    return await file.length();
  }
  return 0;
}
`,
  };
}

function generateKeyManagerFile(config: DriftConfig): GeneratedFile {
  return {
    path: "lib/core/database/key_manager.dart",
    content: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Key Manager for SQLCipher Encryption

import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';

/// Key derivation strategy
enum KeyStrategy {
  /// Derive key from user password using PBKDF2
  derived,

  /// Store key securely in platform keychain
  stored,

  /// User provides key directly
  userProvided,
}

/// Manages encryption keys for the database
class DatabaseKeyManager {
  static const String _keyStorageKey = '${config.databaseName}_db_key';
  static const String _saltStorageKey = '${config.databaseName}_db_salt';

  final FlutterSecureStorage _secureStorage;
  final KeyStrategy strategy;

  String? _cachedKey;

  DatabaseKeyManager({
    this.strategy = KeyStrategy.${config.encryptionKeyStrategy},
    FlutterSecureStorage? secureStorage,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  /// Get the encryption key (generates if not exists for 'stored' strategy)
  Future<String> getKey() async {
    if (_cachedKey != null) {
      return _cachedKey!;
    }

    switch (strategy) {
      case KeyStrategy.stored:
        _cachedKey = await _getOrCreateStoredKey();
        break;
      case KeyStrategy.derived:
        throw StateError('Use deriveKey() method for derived strategy');
      case KeyStrategy.userProvided:
        throw StateError('Use setUserKey() method for user-provided strategy');
    }

    return _cachedKey!;
  }

  /// Derive key from user password using PBKDF2
  Future<String> deriveKey(String password) async {
    if (strategy != KeyStrategy.derived) {
      throw StateError('deriveKey() only works with derived strategy');
    }

    String? salt = await _secureStorage.read(key: _saltStorageKey);
    if (salt == null) {
      salt = _generateSalt();
      await _secureStorage.write(key: _saltStorageKey, value: salt);
    }

    final key = _pbkdf2(password, salt, iterations: 100000, keyLength: 32);
    _cachedKey = base64.encode(key);
    return _cachedKey!;
  }

  /// Set user-provided key
  Future<void> setUserKey(String key) async {
    if (strategy != KeyStrategy.userProvided) {
      throw StateError('setUserKey() only works with userProvided strategy');
    }

    if (key.length < 16) {
      throw ArgumentError('Key must be at least 16 characters');
    }

    _cachedKey = key;
    final hash = sha256.convert(utf8.encode(key)).toString();
    await _secureStorage.write(key: '\${_keyStorageKey}_hash', value: hash);
  }

  /// Verify if the provided key matches the stored key
  Future<bool> verifyUserKey(String key) async {
    final storedHash = await _secureStorage.read(key: '\${_keyStorageKey}_hash');
    if (storedHash == null) {
      return true;
    }

    final hash = sha256.convert(utf8.encode(key)).toString();
    return hash == storedHash;
  }

  /// Clear cached key (call on logout)
  void clearCache() {
    _cachedKey = null;
  }

  /// Delete all stored keys
  Future<void> deleteAllKeys() async {
    _cachedKey = null;
    await _secureStorage.delete(key: _keyStorageKey);
    await _secureStorage.delete(key: _saltStorageKey);
    await _secureStorage.delete(key: '\${_keyStorageKey}_hash');
  }

  /// Check if key exists
  Future<bool> hasKey() async {
    switch (strategy) {
      case KeyStrategy.stored:
        return await _secureStorage.containsKey(key: _keyStorageKey);
      case KeyStrategy.derived:
        return await _secureStorage.containsKey(key: _saltStorageKey);
      case KeyStrategy.userProvided:
        return await _secureStorage.containsKey(key: '\${_keyStorageKey}_hash');
    }
  }

  Future<String> _getOrCreateStoredKey() async {
    String? key = await _secureStorage.read(key: _keyStorageKey);
    if (key == null) {
      key = _generateKey();
      await _secureStorage.write(key: _keyStorageKey, value: key);
    }
    return key;
  }

  String _generateKey() {
    final random = Random.secure();
    final bytes = Uint8List(32);
    for (int i = 0; i < bytes.length; i++) {
      bytes[i] = random.nextInt(256);
    }
    return base64.encode(bytes);
  }

  String _generateSalt() {
    final random = Random.secure();
    final bytes = Uint8List(16);
    for (int i = 0; i < bytes.length; i++) {
      bytes[i] = random.nextInt(256);
    }
    return base64.encode(bytes);
  }

  Uint8List _pbkdf2(String password, String salt, {int iterations = 100000, int keyLength = 32}) {
    final passwordBytes = utf8.encode(password);
    final saltBytes = base64.decode(salt);

    final hmac = Hmac(sha256, passwordBytes);
    final blockCount = (keyLength / 32).ceil();
    final derived = <int>[];

    for (int i = 1; i <= blockCount; i++) {
      final block = _pbkdf2Block(hmac, saltBytes, i, iterations);
      derived.addAll(block);
    }

    return Uint8List.fromList(derived.take(keyLength).toList());
  }

  List<int> _pbkdf2Block(Hmac hmac, List<int> salt, int blockNum, int iterations) {
    final block = <int>[
      ...salt,
      (blockNum >> 24) & 0xff,
      (blockNum >> 16) & 0xff,
      (blockNum >> 8) & 0xff,
      blockNum & 0xff,
    ];

    var u = hmac.convert(block).bytes;
    var result = List<int>.from(u);

    for (int i = 1; i < iterations; i++) {
      u = hmac.convert(u).bytes;
      for (int j = 0; j < result.length; j++) {
        result[j] ^= u[j];
      }
    }

    return result;
  }
}
`,
  };
}

function generateSyncQueueFile(config: DriftConfig): GeneratedFile {
  return {
    path: "lib/core/database/sync_queue.dart",
    content: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Sync Queue for Offline Changes

import 'dart:convert';
import 'package:drift/drift.dart';

part 'sync_queue.g.dart';

/// Sync operation types
enum SyncOperation {
  insert,
  update,
  delete,
}

/// Sync status
enum SyncStatus {
  pending,
  inProgress,
  completed,
  failed,
}

/// Table for tracking pending sync operations
@DataClassName('SyncQueueEntry')
class SyncQueueTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get tableName => text()();
  TextColumn get recordId => text()();
  TextColumn get operation => textEnum<SyncOperation>()();
  TextColumn get data => text()();
  TextColumn get status => textEnum<SyncStatus>().withDefault(Constant(SyncStatus.pending.name))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

@DriftAccessor(tables: [SyncQueueTable])
class SyncQueueDao extends DatabaseAccessor<${toPascalCase(config.databaseName)}> with _\$SyncQueueDaoMixin {
  SyncQueueDao(super.db);

  /// Add an operation to the sync queue
  Future<int> enqueue({
    required String tableName,
    required String recordId,
    required SyncOperation operation,
    required Map<String, dynamic> data,
  }) {
    return into(syncQueueTable).insert(SyncQueueTableCompanion.insert(
      tableName: tableName,
      recordId: recordId,
      operation: operation,
      data: jsonEncode(data),
    ));
  }

  /// Get all pending operations
  Future<List<SyncQueueEntry>> getPending({int limit = 100}) {
    return (select(syncQueueTable)
      ..where((t) => t.status.equals(SyncStatus.pending.name))
      ..orderBy([(t) => OrderingTerm.asc(t.createdAt)])
      ..limit(limit))
      .get();
  }

  /// Get pending operations for a specific table
  Future<List<SyncQueueEntry>> getPendingForTable(String tableName) {
    return (select(syncQueueTable)
      ..where((t) => t.tableName.equals(tableName) & t.status.equals(SyncStatus.pending.name))
      ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
      .get();
  }

  /// Mark operation as in progress
  Future<bool> markInProgress(int id) {
    return (update(syncQueueTable)..where((t) => t.id.equals(id)))
        .write(SyncQueueTableCompanion(
          status: const Value(SyncStatus.inProgress),
          updatedAt: Value(DateTime.now()),
        ))
        .then((rows) => rows > 0);
  }

  /// Mark operation as completed (and delete it)
  Future<int> markCompleted(int id) {
    return (delete(syncQueueTable)..where((t) => t.id.equals(id))).go();
  }

  /// Mark operation as failed
  Future<bool> markFailed(int id, String error) async {
    final entry = await (select(syncQueueTable)..where((t) => t.id.equals(id))).getSingleOrNull();
    if (entry == null) return false;

    return (update(syncQueueTable)..where((t) => t.id.equals(id)))
        .write(SyncQueueTableCompanion(
          status: const Value(SyncStatus.failed),
          retryCount: Value(entry.retryCount + 1),
          lastError: Value(error),
          updatedAt: Value(DateTime.now()),
        ))
        .then((rows) => rows > 0);
  }

  /// Retry failed operations
  Future<int> retryFailed({int maxRetries = 3}) {
    return (update(syncQueueTable)
      ..where((t) =>
          t.status.equals(SyncStatus.failed.name) &
          t.retryCount.isSmallerThanValue(maxRetries)))
      .write(const SyncQueueTableCompanion(
        status: Value(SyncStatus.pending),
      ));
  }

  /// Get count of pending operations
  Future<int> pendingCount() async {
    final query = selectOnly(syncQueueTable)
      ..addColumns([syncQueueTable.id.count()])
      ..where(syncQueueTable.status.equals(SyncStatus.pending.name));
    final result = await query.getSingle();
    return result.read(syncQueueTable.id.count()) ?? 0;
  }

  /// Clear all completed operations older than given duration
  Future<int> clearOldCompleted(Duration age) {
    final cutoff = DateTime.now().subtract(age);
    return (delete(syncQueueTable)
      ..where((t) =>
          t.status.equals(SyncStatus.completed.name) &
          t.updatedAt.isSmallerThanValue(cutoff)))
      .go();
  }

  /// Watch pending count for UI updates
  Stream<int> watchPendingCount() {
    final query = selectOnly(syncQueueTable)
      ..addColumns([syncQueueTable.id.count()])
      ..where(syncQueueTable.status.equals(SyncStatus.pending.name));
    return query.watchSingle().map((row) => row.read(syncQueueTable.id.count()) ?? 0);
  }
}
`,
  };
}

export default driftHooks;
