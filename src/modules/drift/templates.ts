/**
 * Drift Module Templates
 *
 * Handlebars templates for generating Drift/SQLite code
 */

import type { Template } from "../../core/types.js";

// ============================================================================
// DATABASE TEMPLATE
// ============================================================================

export const DATABASE_TEMPLATE: Template = {
  id: "drift-database",
  name: "Drift Database",
  description: "Main database class with tables and DAOs",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Database: {{config.databaseName}}
// Schema Version: {{config.schemaVersion}}

import 'dart:io';

import 'package:drift/drift.dart';
{{#if config.webWorker}}
import 'package:drift/wasm.dart';
{{/if}}
{{#if config.encryption}}
import 'package:drift/native.dart' as native;
import 'package:sqlcipher_flutter_libs/sqlcipher_flutter_libs.dart';
{{/if}}
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

{{#each config.tables}}
part '{{snakeCase name}}_table.dart';
{{/each}}
{{#each config.tables}}
part '{{snakeCase name}}_dao.dart';
{{/each}}
part '{{snakeCase config.databaseName}}.g.dart';

@DriftDatabase(
  tables: [
{{#each config.tables}}
    {{pascalCase name}}Table,
{{/each}}
  ],
  daos: [
{{#each config.tables}}
    {{pascalCase name}}Dao,
{{/each}}
  ],
)
class {{pascalCase config.databaseName}} extends _\${{pascalCase config.databaseName}} {
  {{pascalCase config.databaseName}}() : super(_openConnection());

  {{pascalCase config.databaseName}}.forTesting(super.e);

  @override
  int get schemaVersion => {{config.schemaVersion}};

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

{{#if config.webWorker}}
QueryExecutor _openWebConnection() {
  return DatabaseConnection.delayed(Future(() async {
    final result = await WasmDatabase.open(
      databaseName: '{{config.databaseName}}',
      sqlite3Uri: Uri.parse('sqlite3.wasm'),
      driftWorkerUri: Uri.parse('drift_worker.js'),
{{#if config.opfs}}
      // Use OPFS for persistent storage
      enableMigrations: true,
{{/if}}
    );

    if (result.missingFeatures.isNotEmpty) {
      debugPrint('Missing features: \${result.missingFeatures}');
    }

    return result.resolvedExecutor;
  }));
}
{{else}}
QueryExecutor _openWebConnection() {
  throw UnsupportedError('Web support requires webWorker to be enabled');
}
{{/if}}

QueryExecutor _openNativeConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, '{{config.databaseName}}.db'));
{{#if config.encryption}}
    // SQLCipher for encryption
    return native.NativeDatabase.createInBackground(
      file,
      setup: (rawDb) {
        rawDb.execute("PRAGMA key = '\${_getEncryptionKey()}'");
      },
    );
{{else}}
    return NativeDatabase.createInBackground(file);
{{/if}}
  });
}
{{#if config.encryption}}

String _getEncryptionKey() {
  // TODO: Implement secure key retrieval
  // Use KeyManager for production
  return 'your-secure-key-here';
}
{{/if}}
`,
  output: {
    path: "lib/core/database",
    filename: "{{snakeCase config.databaseName}}",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// TABLE TEMPLATE
// ============================================================================

export const TABLE_TEMPLATE: Template = {
  id: "drift-table",
  name: "Drift Table",
  description: "Table definition for a Drift database",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Table: {{table.name}}

part of '{{snakeCase config.databaseName}}.dart';

{{#if table.timestamps}}
/// {{pascalCase table.name}} table with automatic timestamps
{{else}}
/// {{pascalCase table.name}} table
{{/if}}
@DataClassName('{{pascalCase table.name}}')
class {{pascalCase table.name}}Table extends Table {
{{#each table.columns}}
  {{#if primaryKey}}
  {{#if autoIncrement}}
  {{driftType type}} get {{camelCase name}} => {{driftTypeCall type}}().autoIncrement()();
  {{else}}
  {{driftType type}} get {{camelCase name}} => {{driftTypeCall type}}()();
  {{/if}}
  {{else}}
  {{driftType type}} get {{camelCase name}} => {{driftTypeCall type}}(){{#if nullable}}.nullable(){{/if}}{{#if unique}}.unique(){{/if}}{{#if defaultValue}}.withDefault(const Constant({{defaultValue}})){{/if}}{{#if references}}.references({{pascalCase references.table}}Table, #{{camelCase references.column}}{{#if references.onDelete}}, onDelete: KeyAction.{{references.onDelete}}{{/if}}){{/if}}();
  {{/if}}
{{/each}}

{{#if table.timestamps}}
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
{{/if}}
{{#if table.softDelete}}
  DateTimeColumn get deletedAt => dateTime().nullable()();
{{/if}}

{{#if table.indexes}}
  @override
  List<Set<Column>> get uniqueKeys => [
{{#each table.indexes}}
{{#if unique}}
    {
{{#each columns}}
      {{camelCase this}},
{{/each}}
    },
{{/if}}
{{/each}}
  ];
{{/if}}

  @override
  Set<Column> get primaryKey {
{{#each table.columns}}
{{#if primaryKey}}
    return {{{camelCase name}}};
{{/if}}
{{/each}}
  }
}
`,
  output: {
    path: "lib/core/database",
    filename: "{{snakeCase table.name}}_table",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// DAO TEMPLATE
// ============================================================================

export const DAO_TEMPLATE: Template = {
  id: "drift-dao",
  name: "Drift DAO",
  description: "Data Access Object for a Drift table",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// DAO: {{pascalCase table.name}}Dao

part of '{{snakeCase config.databaseName}}.dart';

@DriftAccessor(tables: [{{pascalCase table.name}}Table])
class {{pascalCase table.name}}Dao extends DatabaseAccessor<{{pascalCase config.databaseName}}> with _\${{pascalCase table.name}}DaoMixin {
  {{pascalCase table.name}}Dao(super.db);

  /// Get all {{table.name}} entries
  Future<List<{{pascalCase table.name}}>> getAll() {
{{#if table.softDelete}}
    return (select({{camelCase table.name}}Table)
      ..where((t) => t.deletedAt.isNull()))
      .get();
{{else}}
    return select({{camelCase table.name}}Table).get();
{{/if}}
  }

  /// Watch all {{table.name}} entries
  Stream<List<{{pascalCase table.name}}>> watchAll() {
{{#if table.softDelete}}
    return (select({{camelCase table.name}}Table)
      ..where((t) => t.deletedAt.isNull()))
      .watch();
{{else}}
    return select({{camelCase table.name}}Table).watch();
{{/if}}
  }

  /// Get {{table.name}} by ID
  Future<{{pascalCase table.name}}?> getById({{primaryKeyType table}} id) {
    return (select({{camelCase table.name}}Table)
      ..where((t) => t.{{primaryKeyColumn table}}.equals(id)))
      .getSingleOrNull();
  }

  /// Watch {{table.name}} by ID
  Stream<{{pascalCase table.name}}?> watchById({{primaryKeyType table}} id) {
    return (select({{camelCase table.name}}Table)
      ..where((t) => t.{{primaryKeyColumn table}}.equals(id)))
      .watchSingleOrNull();
  }

  /// Insert a new {{table.name}}
  Future<int> insertOne({{pascalCase table.name}}TableCompanion entry) {
    return into({{camelCase table.name}}Table).insert(entry);
  }

  /// Insert or replace a {{table.name}}
  Future<int> upsertOne({{pascalCase table.name}}TableCompanion entry) {
    return into({{camelCase table.name}}Table).insertOnConflictUpdate(entry);
  }

  /// Update a {{table.name}}
  Future<bool> updateOne({{pascalCase table.name}} entry) {
{{#if table.timestamps}}
    final updated = entry.copyWith(updatedAt: DateTime.now());
    return update({{camelCase table.name}}Table).replace(updated);
{{else}}
    return update({{camelCase table.name}}Table).replace(entry);
{{/if}}
  }

  /// Delete a {{table.name}} by ID
{{#if table.softDelete}}
  Future<int> deleteById({{primaryKeyType table}} id) {
    return (update({{camelCase table.name}}Table)
      ..where((t) => t.{{primaryKeyColumn table}}.equals(id)))
      .write({{pascalCase table.name}}TableCompanion(
        deletedAt: Value(DateTime.now()),
      ));
  }

  /// Hard delete a {{table.name}} by ID (permanently)
  Future<int> hardDeleteById({{primaryKeyType table}} id) {
    return (delete({{camelCase table.name}}Table)
      ..where((t) => t.{{primaryKeyColumn table}}.equals(id)))
      .go();
  }

  /// Restore a soft-deleted {{table.name}}
  Future<int> restoreById({{primaryKeyType table}} id) {
    return (update({{camelCase table.name}}Table)
      ..where((t) => t.{{primaryKeyColumn table}}.equals(id)))
      .write(const {{pascalCase table.name}}TableCompanion(
        deletedAt: Value(null),
      ));
  }
{{else}}
  Future<int> deleteById({{primaryKeyType table}} id) {
    return (delete({{camelCase table.name}}Table)
      ..where((t) => t.{{primaryKeyColumn table}}.equals(id)))
      .go();
  }
{{/if}}

  /// Delete all {{table.name}} entries
{{#if table.softDelete}}
  Future<int> deleteAll() {
    return update({{camelCase table.name}}Table).write(
      {{pascalCase table.name}}TableCompanion(
        deletedAt: Value(DateTime.now()),
      ),
    );
  }
{{else}}
  Future<int> deleteAll() {
    return delete({{camelCase table.name}}Table).go();
  }
{{/if}}

  /// Count all {{table.name}} entries
  Future<int> count() async {
    final query = selectOnly({{camelCase table.name}}Table)
      ..addColumns([{{camelCase table.name}}Table.{{primaryKeyColumn table}}.count()]);
{{#if table.softDelete}}
    query.where({{camelCase table.name}}Table.deletedAt.isNull());
{{/if}}
    final result = await query.getSingle();
    return result.read({{camelCase table.name}}Table.{{primaryKeyColumn table}}.count()) ?? 0;
  }
}
`,
  output: {
    path: "lib/core/database",
    filename: "{{snakeCase table.name}}_dao",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// WEB DATABASE TEMPLATE
// ============================================================================

export const WEB_DATABASE_TEMPLATE: Template = {
  id: "drift-web-database",
  name: "Drift Web Database",
  description: "Web-specific database setup with WASM and OPFS",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
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
  output: {
    path: "lib/core/database",
    filename: "web_database",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// NATIVE DATABASE TEMPLATE
// ============================================================================

export const NATIVE_DATABASE_TEMPLATE: Template = {
  id: "drift-native-database",
  name: "Drift Native Database",
  description: "Native platform database setup with FFI",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Native Database Connection

import 'dart:io';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
{{#if config.encryption}}
import 'package:sqlcipher_flutter_libs/sqlcipher_flutter_libs.dart';
{{/if}}

/// Opens a database connection for native platforms (iOS, Android, Desktop)
Future<NativeDatabase> openNativeDatabase({
  required String databaseName,
{{#if config.encryption}}
  String? encryptionKey,
{{/if}}
  bool logStatements = false,
}) async {
  final dbFolder = await getApplicationDocumentsDirectory();
  final file = File(p.join(dbFolder.path, '$databaseName.db'));

{{#if config.encryption}}
  return NativeDatabase.createInBackground(
    file,
    logStatements: logStatements,
    setup: (rawDb) {
      if (encryptionKey != null) {
        rawDb.execute("PRAGMA key = '\$encryptionKey'");
      }
    },
  );
{{else}}
  return NativeDatabase.createInBackground(
    file,
    logStatements: logStatements,
  );
{{/if}}
}

/// Get the database file path
Future<String> getDatabasePath(String databaseName) async {
  final dbFolder = await getApplicationDocumentsDirectory();
  return p.join(dbFolder.path, '$databaseName.db');
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
  output: {
    path: "lib/core/database",
    filename: "native_database",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// MIGRATION TEMPLATE
// ============================================================================

export const MIGRATION_TEMPLATE: Template = {
  id: "drift-migration",
  name: "Drift Migration",
  description: "Database schema migration file",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Migration: {{migration.name}}
// From version {{migration.fromVersion}} to {{migration.toVersion}}
// Created: {{migration.createdAt}}

import 'package:drift/drift.dart';

/// Migration from version {{migration.fromVersion}} to {{migration.toVersion}}
class Migration{{migration.toVersion}} {
  static Future<void> up(Migrator m) async {
{{#each migration.upStatements}}
    await m.database.customStatement('''
{{{this}}}
''');
{{/each}}
  }

  static Future<void> down(Migrator m) async {
{{#each migration.downStatements}}
    await m.database.customStatement('''
{{{this}}}
''');
{{/each}}
  }
}

/// Apply this migration
Future<void> applyMigration{{migration.toVersion}}(Migrator m, int from, int to) async {
  if (from < {{migration.toVersion}} && to >= {{migration.toVersion}}) {
    await Migration{{migration.toVersion}}.up(m);
  }
}
`,
  output: {
    path: "lib/core/database/migrations",
    filename: "migration_{{migration.toVersion}}",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// KEY MANAGER TEMPLATE
// ============================================================================

export const KEY_MANAGER_TEMPLATE: Template = {
  id: "drift-key-manager",
  name: "Drift Key Manager",
  description: "Encryption key management for SQLCipher",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Key Manager for SQLCipher Encryption

import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
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
  static const String _keyStorageKey = '{{config.databaseName}}_db_key';
  static const String _saltStorageKey = '{{config.databaseName}}_db_salt';

  final FlutterSecureStorage _secureStorage;
  final KeyStrategy strategy;

  String? _cachedKey;

  DatabaseKeyManager({
    this.strategy = KeyStrategy.{{config.encryptionKeyStrategy}},
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
    // Optionally store a hash to verify key on next use
    final hash = sha256.convert(utf8.encode(key)).toString();
    await _secureStorage.write(key: '\${_keyStorageKey}_hash', value: hash);
  }

  /// Verify if the provided key matches the stored key (for userProvided)
  Future<bool> verifyUserKey(String key) async {
    final storedHash = await _secureStorage.read(key: '\${_keyStorageKey}_hash');
    if (storedHash == null) {
      return true; // First time, no hash stored
    }

    final hash = sha256.convert(utf8.encode(key)).toString();
    return hash == storedHash;
  }

  /// Clear cached key (call on logout)
  void clearCache() {
    _cachedKey = null;
  }

  /// Delete all stored keys (use with caution - data will be unrecoverable!)
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

    // PBKDF2-HMAC-SHA256
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
  output: {
    path: "lib/core/database",
    filename: "key_manager",
    extension: ".dart",
  },
  requires: ["drift", "flutter_secure_storage", "crypto"],
};

// ============================================================================
// SYNC QUEUE TEMPLATE
// ============================================================================

export const SYNC_QUEUE_TEMPLATE: Template = {
  id: "drift-sync-queue",
  name: "Drift Sync Queue",
  description: "Queue for pending offline changes to sync",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
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
  TextColumn get data => text()(); // JSON encoded
  TextColumn get status => textEnum<SyncStatus>().withDefault(Constant(SyncStatus.pending.name))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

@DriftAccessor(tables: [SyncQueueTable])
class SyncQueueDao extends DatabaseAccessor<{{pascalCase config.databaseName}}> with _\$SyncQueueDaoMixin {
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
  output: {
    path: "lib/core/database",
    filename: "sync_queue",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const DRIFT_TEMPLATES: Template[] = [
  DATABASE_TEMPLATE,
  TABLE_TEMPLATE,
  DAO_TEMPLATE,
  WEB_DATABASE_TEMPLATE,
  NATIVE_DATABASE_TEMPLATE,
  MIGRATION_TEMPLATE,
  KEY_MANAGER_TEMPLATE,
  SYNC_QUEUE_TEMPLATE,
];

export default DRIFT_TEMPLATES;
