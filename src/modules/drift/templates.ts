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
// TIER 1: CRITICAL OFFLINE FEATURES
// ============================================================================

// ============================================================================
// CONFLICT RESOLUTION TEMPLATE (Template 1)
// ============================================================================

export const CONFLICT_RESOLUTION_TEMPLATE: Template = {
  id: "drift-conflict-resolution",
  name: "Drift Conflict Resolution",
  description: "Handles data conflicts when syncing offline changes with server",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Conflict Resolution Manager
// Strategy: {{config.conflictResolution.strategy}}

import 'dart:convert';
import 'package:drift/drift.dart';

/// Conflict resolution strategies
enum ConflictStrategy {
  /// Server data always wins
  serverWins,

  /// Client data always wins
  clientWins,

  /// Most recent timestamp wins
  lastWriteWins,

  /// Merge fields intelligently
  merge,

  /// Manual resolution required
  manual,
}

/// Represents a data conflict between local and remote versions
class DataConflict<T> {
  final String recordId;
  final String tableName;
  final T? localVersion;
  final T? serverVersion;
  final DateTime localTimestamp;
  final DateTime serverTimestamp;
  final Map<String, dynamic> localChanges;
  final Map<String, dynamic> serverChanges;
  final ConflictStrategy suggestedStrategy;

  const DataConflict({
    required this.recordId,
    required this.tableName,
    this.localVersion,
    this.serverVersion,
    required this.localTimestamp,
    required this.serverTimestamp,
    required this.localChanges,
    required this.serverChanges,
    this.suggestedStrategy = ConflictStrategy.lastWriteWins,
  });

  /// Check if this is a real conflict (both sides modified)
  bool get isRealConflict =>
      localChanges.isNotEmpty && serverChanges.isNotEmpty;

  /// Get conflicting field names
  Set<String> get conflictingFields =>
      localChanges.keys.toSet().intersection(serverChanges.keys.toSet());

  /// Check if server version is newer
  bool get serverIsNewer => serverTimestamp.isAfter(localTimestamp);
}

/// Result of conflict resolution
class ConflictResolution<T> {
  final T resolvedData;
  final ConflictStrategy strategyUsed;
  final Map<String, dynamic> mergedFields;
  final bool requiresUserReview;

  const ConflictResolution({
    required this.resolvedData,
    required this.strategyUsed,
    required this.mergedFields,
    this.requiresUserReview = false,
  });
}

/// Manages conflict resolution for offline sync
class ConflictResolver {
  final ConflictStrategy defaultStrategy;
  final Map<String, ConflictStrategy> tableStrategies;
  final Map<String, ConflictStrategy> fieldStrategies;

  ConflictResolver({
    this.defaultStrategy = ConflictStrategy.{{config.conflictResolution.strategy}},
    this.tableStrategies = const {},
    this.fieldStrategies = const {},
  });

  /// Resolve a conflict using the configured strategy
  Future<ConflictResolution<Map<String, dynamic>>> resolve(
    DataConflict<Map<String, dynamic>> conflict,
  ) async {
    final strategy = _getStrategy(conflict.tableName);

    switch (strategy) {
      case ConflictStrategy.serverWins:
        return _resolveServerWins(conflict);

      case ConflictStrategy.clientWins:
        return _resolveClientWins(conflict);

      case ConflictStrategy.lastWriteWins:
        return _resolveLastWriteWins(conflict);

      case ConflictStrategy.merge:
        return _resolveMerge(conflict);

      case ConflictStrategy.manual:
        return _resolveManual(conflict);
    }
  }

  ConflictStrategy _getStrategy(String tableName) {
    return tableStrategies[tableName] ?? defaultStrategy;
  }

  ConflictResolution<Map<String, dynamic>> _resolveServerWins(
    DataConflict<Map<String, dynamic>> conflict,
  ) {
    return ConflictResolution(
      resolvedData: conflict.serverVersion ?? {},
      strategyUsed: ConflictStrategy.serverWins,
      mergedFields: conflict.serverChanges,
    );
  }

  ConflictResolution<Map<String, dynamic>> _resolveClientWins(
    DataConflict<Map<String, dynamic>> conflict,
  ) {
    return ConflictResolution(
      resolvedData: conflict.localVersion ?? {},
      strategyUsed: ConflictStrategy.clientWins,
      mergedFields: conflict.localChanges,
    );
  }

  ConflictResolution<Map<String, dynamic>> _resolveLastWriteWins(
    DataConflict<Map<String, dynamic>> conflict,
  ) {
    if (conflict.serverIsNewer) {
      return _resolveServerWins(conflict);
    } else {
      return _resolveClientWins(conflict);
    }
  }

  ConflictResolution<Map<String, dynamic>> _resolveMerge(
    DataConflict<Map<String, dynamic>> conflict,
  ) {
    final merged = <String, dynamic>{};
    final base = conflict.serverVersion ?? {};

    // Start with server version
    merged.addAll(base);

    // Apply non-conflicting local changes
    for (final entry in conflict.localChanges.entries) {
      if (!conflict.conflictingFields.contains(entry.key)) {
        merged[entry.key] = entry.value;
      }
    }

    // For conflicting fields, use field-specific strategy or last-write-wins
    for (final field in conflict.conflictingFields) {
      final fieldStrategy = fieldStrategies['\${conflict.tableName}.\$field'];
      if (fieldStrategy == ConflictStrategy.clientWins) {
        merged[field] = conflict.localChanges[field];
      } else if (fieldStrategy == ConflictStrategy.serverWins) {
        merged[field] = conflict.serverChanges[field];
      } else {
        // Default: last write wins for this field
        merged[field] = conflict.serverIsNewer
            ? conflict.serverChanges[field]
            : conflict.localChanges[field];
      }
    }

    return ConflictResolution(
      resolvedData: merged,
      strategyUsed: ConflictStrategy.merge,
      mergedFields: merged,
      requiresUserReview: conflict.conflictingFields.isNotEmpty,
    );
  }

  ConflictResolution<Map<String, dynamic>> _resolveManual(
    DataConflict<Map<String, dynamic>> conflict,
  ) {
    // Return server version but flag for manual review
    return ConflictResolution(
      resolvedData: conflict.serverVersion ?? {},
      strategyUsed: ConflictStrategy.manual,
      mergedFields: {},
      requiresUserReview: true,
    );
  }

  /// Detect conflicts between local pending changes and server data
  List<DataConflict<Map<String, dynamic>>> detectConflicts({
    required List<Map<String, dynamic>> localPending,
    required List<Map<String, dynamic>> serverData,
    required String tableName,
    required String idField,
    required String timestampField,
  }) {
    final conflicts = <DataConflict<Map<String, dynamic>>>[];

    final serverMap = {
      for (final item in serverData) item[idField].toString(): item
    };

    for (final local in localPending) {
      final id = local[idField].toString();
      final server = serverMap[id];

      if (server != null) {
        final localTimestamp = DateTime.parse(local[timestampField] as String);
        final serverTimestamp = DateTime.parse(server[timestampField] as String);

        // Detect which fields changed
        final localChanges = <String, dynamic>{};
        final serverChanges = <String, dynamic>{};

        for (final key in {...local.keys, ...server.keys}) {
          if (key == idField || key == timestampField) continue;

          if (local[key] != server[key]) {
            if (local.containsKey(key)) localChanges[key] = local[key];
            if (server.containsKey(key)) serverChanges[key] = server[key];
          }
        }

        if (localChanges.isNotEmpty && serverChanges.isNotEmpty) {
          conflicts.add(DataConflict(
            recordId: id,
            tableName: tableName,
            localVersion: local,
            serverVersion: server,
            localTimestamp: localTimestamp,
            serverTimestamp: serverTimestamp,
            localChanges: localChanges,
            serverChanges: serverChanges,
          ));
        }
      }
    }

    return conflicts;
  }
}

/// Stream controller for conflict notifications
class ConflictNotifier {
  final _controller = StreamController<DataConflict>.broadcast();

  Stream<DataConflict> get conflicts => _controller.stream;

  void notify(DataConflict conflict) {
    _controller.add(conflict);
  }

  void dispose() {
    _controller.close();
  }
}
`,
  output: {
    path: "lib/core/sync",
    filename: "conflict_resolver",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// BACKGROUND SYNC TEMPLATE (Template 2)
// ============================================================================

export const BACKGROUND_SYNC_TEMPLATE: Template = {
  id: "drift-background-sync",
  name: "Drift Background Sync",
  description: "Background synchronization service for offline data",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Background Sync Service
// Sync Interval: {{config.sync.intervalSeconds}} seconds

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Sync state for UI updates
enum SyncState {
  idle,
  syncing,
  completed,
  failed,
  offline,
}

/// Progress information for sync operations
class SyncProgress {
  final int totalItems;
  final int completedItems;
  final int failedItems;
  final String? currentTable;
  final SyncState state;
  final String? lastError;
  final DateTime? lastSyncTime;

  const SyncProgress({
    this.totalItems = 0,
    this.completedItems = 0,
    this.failedItems = 0,
    this.currentTable,
    this.state = SyncState.idle,
    this.lastError,
    this.lastSyncTime,
  });

  double get progressPercent =>
      totalItems > 0 ? completedItems / totalItems : 0.0;

  SyncProgress copyWith({
    int? totalItems,
    int? completedItems,
    int? failedItems,
    String? currentTable,
    SyncState? state,
    String? lastError,
    DateTime? lastSyncTime,
  }) {
    return SyncProgress(
      totalItems: totalItems ?? this.totalItems,
      completedItems: completedItems ?? this.completedItems,
      failedItems: failedItems ?? this.failedItems,
      currentTable: currentTable ?? this.currentTable,
      state: state ?? this.state,
      lastError: lastError ?? this.lastError,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
    );
  }
}

/// Configuration for background sync
class BackgroundSyncConfig {
  final Duration syncInterval;
  final int maxRetries;
  final Duration retryDelay;
  final int batchSize;
  final bool syncOnConnect;
  final bool syncOnAppResume;
  final List<String> priorityTables;

  const BackgroundSyncConfig({
    this.syncInterval = const Duration(seconds: {{config.sync.intervalSeconds}}),
    this.maxRetries = {{config.sync.maxRetries}},
    this.retryDelay = const Duration(seconds: 5),
    this.batchSize = {{config.sync.batchSize}},
    this.syncOnConnect = true,
    this.syncOnAppResume = true,
    this.priorityTables = const [],
  });
}

/// Handles background data synchronization
class BackgroundSyncService {
  final BackgroundSyncConfig config;
  final Future<bool> Function() checkConnectivity;
  final Future<void> Function(String table, List<Map<String, dynamic>> data) uploadBatch;
  final Future<List<Map<String, dynamic>>> Function(String table, DateTime? since) fetchUpdates;

  Timer? _syncTimer;
  StreamSubscription? _connectivitySubscription;
  bool _isSyncing = false;

  final _progressController = StreamController<SyncProgress>.broadcast();
  Stream<SyncProgress> get progressStream => _progressController.stream;

  SyncProgress _currentProgress = const SyncProgress();
  SyncProgress get currentProgress => _currentProgress;

  BackgroundSyncService({
    required this.config,
    required this.checkConnectivity,
    required this.uploadBatch,
    required this.fetchUpdates,
  });

  /// Start the background sync service
  void start() {
    // Start periodic sync
    _syncTimer = Timer.periodic(config.syncInterval, (_) {
      syncNow();
    });

    // Listen for connectivity changes
    if (config.syncOnConnect) {
      _connectivitySubscription = Connectivity()
          .onConnectivityChanged
          .listen((results) {
        final isConnected = results.any((r) =>
            r != ConnectivityResult.none);
        if (isConnected && !_isSyncing) {
          syncNow();
        }
      });
    }
  }

  /// Stop the background sync service
  void stop() {
    _syncTimer?.cancel();
    _connectivitySubscription?.cancel();
    _syncTimer = null;
    _connectivitySubscription = null;
  }

  /// Trigger immediate sync
  Future<SyncResult> syncNow() async {
    if (_isSyncing) {
      return SyncResult(
        success: false,
        message: 'Sync already in progress',
      );
    }

    _isSyncing = true;
    _updateProgress(_currentProgress.copyWith(state: SyncState.syncing));

    try {
      // Check connectivity
      final isOnline = await checkConnectivity();
      if (!isOnline) {
        _updateProgress(_currentProgress.copyWith(state: SyncState.offline));
        return SyncResult(
          success: false,
          message: 'No network connection',
        );
      }

      // Get pending changes from sync queue
      final pendingChanges = await _getPendingChanges();
      final totalItems = pendingChanges.values.fold<int>(
          0, (sum, list) => sum + list.length);

      _updateProgress(_currentProgress.copyWith(
        totalItems: totalItems,
        completedItems: 0,
        failedItems: 0,
      ));

      int completed = 0;
      int failed = 0;

      // Sync priority tables first
      final tables = [...config.priorityTables];
      for (final table in pendingChanges.keys) {
        if (!tables.contains(table)) {
          tables.add(table);
        }
      }

      for (final table in tables) {
        final changes = pendingChanges[table] ?? [];
        if (changes.isEmpty) continue;

        _updateProgress(_currentProgress.copyWith(currentTable: table));

        // Process in batches
        for (var i = 0; i < changes.length; i += config.batchSize) {
          final batch = changes.skip(i).take(config.batchSize).toList();

          try {
            await uploadBatch(table, batch);
            completed += batch.length;
            _updateProgress(_currentProgress.copyWith(
              completedItems: completed,
            ));
          } catch (e) {
            failed += batch.length;
            _updateProgress(_currentProgress.copyWith(
              failedItems: failed,
              lastError: e.toString(),
            ));
          }
        }
      }

      // Fetch remote updates
      await _fetchRemoteUpdates();

      _updateProgress(_currentProgress.copyWith(
        state: failed > 0 ? SyncState.failed : SyncState.completed,
        lastSyncTime: DateTime.now(),
        currentTable: null,
      ));

      return SyncResult(
        success: failed == 0,
        itemsSynced: completed,
        itemsFailed: failed,
        message: failed > 0
            ? 'Sync completed with \$failed errors'
            : 'Sync completed successfully',
      );
    } catch (e) {
      _updateProgress(_currentProgress.copyWith(
        state: SyncState.failed,
        lastError: e.toString(),
      ));
      return SyncResult(
        success: false,
        message: e.toString(),
      );
    } finally {
      _isSyncing = false;
    }
  }

  Future<Map<String, List<Map<String, dynamic>>>> _getPendingChanges() async {
    // Override this to get pending changes from your sync queue
    return {};
  }

  Future<void> _fetchRemoteUpdates() async {
    // Override this to fetch and apply remote updates
  }

  void _updateProgress(SyncProgress progress) {
    _currentProgress = progress;
    _progressController.add(progress);
  }

  void dispose() {
    stop();
    _progressController.close();
  }
}

/// Result of a sync operation
class SyncResult {
  final bool success;
  final int itemsSynced;
  final int itemsFailed;
  final String? message;
  final List<String> errors;

  const SyncResult({
    required this.success,
    this.itemsSynced = 0,
    this.itemsFailed = 0,
    this.message,
    this.errors = const [],
  });
}

/// Mixin for sync-aware database operations
mixin SyncAwareMixin {
  /// Mark a record for sync
  Future<void> markForSync(String table, String recordId, String operation);

  /// Get last sync time for a table
  Future<DateTime?> getLastSyncTime(String table);

  /// Update last sync time for a table
  Future<void> updateLastSyncTime(String table, DateTime time);
}
`,
  output: {
    path: "lib/core/sync",
    filename: "background_sync_service",
    extension: ".dart",
  },
  requires: ["drift", "connectivity_plus"],
};

// ============================================================================
// OFFLINE INDICATOR TEMPLATE (Template 3)
// ============================================================================

export const OFFLINE_INDICATOR_TEMPLATE: Template = {
  id: "drift-offline-indicator",
  name: "Drift Offline Indicator",
  description: "UI components and state management for offline status indication",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Offline Indicator Components

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Connection quality levels
enum ConnectionQuality {
  excellent,
  good,
  fair,
  poor,
  offline,
}

/// Detailed connectivity state
class ConnectivityState {
  final bool isOnline;
  final ConnectionQuality quality;
  final String connectionType;
  final int pendingSyncCount;
  final DateTime? lastOnlineTime;
  final bool isSyncing;

  const ConnectivityState({
    this.isOnline = true,
    this.quality = ConnectionQuality.excellent,
    this.connectionType = 'unknown',
    this.pendingSyncCount = 0,
    this.lastOnlineTime,
    this.isSyncing = false,
  });

  ConnectivityState copyWith({
    bool? isOnline,
    ConnectionQuality? quality,
    String? connectionType,
    int? pendingSyncCount,
    DateTime? lastOnlineTime,
    bool? isSyncing,
  }) {
    return ConnectivityState(
      isOnline: isOnline ?? this.isOnline,
      quality: quality ?? this.quality,
      connectionType: connectionType ?? this.connectionType,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
      lastOnlineTime: lastOnlineTime ?? this.lastOnlineTime,
      isSyncing: isSyncing ?? this.isSyncing,
    );
  }
}

/// Monitors and broadcasts connectivity state changes
class ConnectivityMonitor {
  static final ConnectivityMonitor _instance = ConnectivityMonitor._();
  static ConnectivityMonitor get instance => _instance;

  ConnectivityMonitor._();

  final _stateController = StreamController<ConnectivityState>.broadcast();
  Stream<ConnectivityState> get stateStream => _stateController.stream;

  ConnectivityState _currentState = const ConnectivityState();
  ConnectivityState get currentState => _currentState;

  StreamSubscription? _connectivitySubscription;
  Timer? _qualityCheckTimer;

  /// Initialize the connectivity monitor
  void initialize() {
    _connectivitySubscription = Connectivity()
        .onConnectivityChanged
        .listen(_handleConnectivityChange);

    // Periodic quality check
    _qualityCheckTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _checkConnectionQuality(),
    );

    // Initial check
    _checkConnectivity();
  }

  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final hasConnection = results.any((r) => r != ConnectivityResult.none);
    final connectionType = _getConnectionType(results);

    _updateState(_currentState.copyWith(
      isOnline: hasConnection,
      connectionType: connectionType,
      lastOnlineTime: hasConnection ? DateTime.now() : _currentState.lastOnlineTime,
    ));

    if (hasConnection) {
      _checkConnectionQuality();
    } else {
      _updateState(_currentState.copyWith(
        quality: ConnectionQuality.offline,
      ));
    }
  }

  String _getConnectionType(List<ConnectivityResult> results) {
    if (results.contains(ConnectivityResult.wifi)) return 'wifi';
    if (results.contains(ConnectivityResult.mobile)) return 'mobile';
    if (results.contains(ConnectivityResult.ethernet)) return 'ethernet';
    if (results.contains(ConnectivityResult.vpn)) return 'vpn';
    return 'none';
  }

  Future<void> _checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    _handleConnectivityChange(results);
  }

  Future<void> _checkConnectionQuality() async {
    if (!_currentState.isOnline) return;

    try {
      final stopwatch = Stopwatch()..start();
      // Simple ping test - override with actual implementation
      await Future.delayed(const Duration(milliseconds: 100));
      stopwatch.stop();

      final latency = stopwatch.elapsedMilliseconds;
      final quality = _latencyToQuality(latency);

      _updateState(_currentState.copyWith(quality: quality));
    } catch (e) {
      _updateState(_currentState.copyWith(
        quality: ConnectionQuality.poor,
      ));
    }
  }

  ConnectionQuality _latencyToQuality(int latencyMs) {
    if (latencyMs < 50) return ConnectionQuality.excellent;
    if (latencyMs < 150) return ConnectionQuality.good;
    if (latencyMs < 300) return ConnectionQuality.fair;
    return ConnectionQuality.poor;
  }

  /// Update pending sync count
  void updatePendingCount(int count) {
    _updateState(_currentState.copyWith(pendingSyncCount: count));
  }

  /// Update syncing state
  void updateSyncingState(bool isSyncing) {
    _updateState(_currentState.copyWith(isSyncing: isSyncing));
  }

  void _updateState(ConnectivityState state) {
    _currentState = state;
    _stateController.add(state);
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _qualityCheckTimer?.cancel();
    _stateController.close();
  }
}

/// Offline banner widget that appears when offline
class OfflineBanner extends StatelessWidget {
  final Widget child;
  final Color? backgroundColor;
  final Color? textColor;
  final String? offlineMessage;
  final String? syncingMessage;
  final bool showSyncProgress;

  const OfflineBanner({
    super.key,
    required this.child,
    this.backgroundColor,
    this.textColor,
    this.offlineMessage,
    this.syncingMessage,
    this.showSyncProgress = true,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ConnectivityState>(
      stream: ConnectivityMonitor.instance.stateStream,
      initialData: ConnectivityMonitor.instance.currentState,
      builder: (context, snapshot) {
        final state = snapshot.data!;

        return Column(
          children: [
            if (!state.isOnline || state.isSyncing || state.pendingSyncCount > 0)
              _buildBanner(context, state),
            Expanded(child: child),
          ],
        );
      },
    );
  }

  Widget _buildBanner(BuildContext context, ConnectivityState state) {
    final theme = Theme.of(context);

    Color bgColor;
    String message;
    IconData icon;

    if (!state.isOnline) {
      bgColor = backgroundColor ?? Colors.grey.shade800;
      message = offlineMessage ?? 'You are offline';
      icon = Icons.cloud_off;
    } else if (state.isSyncing) {
      bgColor = backgroundColor ?? Colors.blue.shade700;
      message = syncingMessage ?? 'Syncing...';
      icon = Icons.sync;
    } else {
      bgColor = backgroundColor ?? Colors.orange.shade700;
      message = '\${state.pendingSyncCount} changes pending';
      icon = Icons.cloud_upload_outlined;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: bgColor,
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: textColor ?? Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              message,
              style: TextStyle(
                color: textColor ?? Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (state.isSyncing) ...[
              const SizedBox(width: 8),
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(textColor ?? Colors.white),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Connection quality indicator widget
class ConnectionQualityIndicator extends StatelessWidget {
  final double size;
  final bool showLabel;

  const ConnectionQualityIndicator({
    super.key,
    this.size = 24,
    this.showLabel = false,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ConnectivityState>(
      stream: ConnectivityMonitor.instance.stateStream,
      initialData: ConnectivityMonitor.instance.currentState,
      builder: (context, snapshot) {
        final state = snapshot.data!;
        final (icon, color, label) = _getIndicatorData(state);

        if (showLabel) {
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: size),
              const SizedBox(width: 4),
              Text(label, style: TextStyle(color: color)),
            ],
          );
        }

        return Icon(icon, color: color, size: size);
      },
    );
  }

  (IconData, Color, String) _getIndicatorData(ConnectivityState state) {
    if (!state.isOnline) {
      return (Icons.signal_wifi_off, Colors.red, 'Offline');
    }

    switch (state.quality) {
      case ConnectionQuality.excellent:
        return (Icons.signal_wifi_4_bar, Colors.green, 'Excellent');
      case ConnectionQuality.good:
        return (Icons.network_wifi_3_bar, Colors.green.shade300, 'Good');
      case ConnectionQuality.fair:
        return (Icons.network_wifi_2_bar, Colors.orange, 'Fair');
      case ConnectionQuality.poor:
        return (Icons.network_wifi_1_bar, Colors.red.shade300, 'Poor');
      case ConnectionQuality.offline:
        return (Icons.signal_wifi_off, Colors.red, 'Offline');
    }
  }
}

/// Sync status indicator widget
class SyncStatusIndicator extends StatelessWidget {
  final double size;
  final VoidCallback? onTap;

  const SyncStatusIndicator({
    super.key,
    this.size = 24,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ConnectivityState>(
      stream: ConnectivityMonitor.instance.stateStream,
      initialData: ConnectivityMonitor.instance.currentState,
      builder: (context, snapshot) {
        final state = snapshot.data!;

        return GestureDetector(
          onTap: onTap,
          child: _buildIndicator(state),
        );
      },
    );
  }

  Widget _buildIndicator(ConnectivityState state) {
    if (state.isSyncing) {
      return SizedBox(
        width: size,
        height: size,
        child: const CircularProgressIndicator(strokeWidth: 2),
      );
    }

    if (state.pendingSyncCount > 0) {
      return Badge(
        label: Text('\${state.pendingSyncCount}'),
        child: Icon(
          Icons.cloud_upload_outlined,
          size: size,
          color: Colors.orange,
        ),
      );
    }

    return Icon(
      Icons.cloud_done,
      size: size,
      color: Colors.green,
    );
  }
}
`,
  output: {
    path: "lib/core/ui",
    filename: "offline_indicator",
    extension: ".dart",
  },
  requires: ["drift", "connectivity_plus"],
};

// ============================================================================
// OPTIMISTIC UPDATE TEMPLATE (Template 4)
// ============================================================================

export const OPTIMISTIC_UPDATE_TEMPLATE: Template = {
  id: "drift-optimistic-update",
  name: "Drift Optimistic Update",
  description: "Optimistic UI updates with rollback support",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Optimistic Update Manager

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Represents a pending optimistic update
class OptimisticUpdate<T> {
  final String id;
  final String table;
  final String recordId;
  final T previousValue;
  final T optimisticValue;
  final DateTime createdAt;
  final OptimisticUpdateStatus status;
  final String? errorMessage;

  const OptimisticUpdate({
    required this.id,
    required this.table,
    required this.recordId,
    required this.previousValue,
    required this.optimisticValue,
    required this.createdAt,
    this.status = OptimisticUpdateStatus.pending,
    this.errorMessage,
  });

  OptimisticUpdate<T> copyWith({
    OptimisticUpdateStatus? status,
    String? errorMessage,
  }) {
    return OptimisticUpdate(
      id: id,
      table: table,
      recordId: recordId,
      previousValue: previousValue,
      optimisticValue: optimisticValue,
      createdAt: createdAt,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

/// Status of an optimistic update
enum OptimisticUpdateStatus {
  pending,
  syncing,
  confirmed,
  failed,
  rolledBack,
}

/// Result of an optimistic operation
class OptimisticResult<T> {
  final bool success;
  final T? data;
  final String? updateId;
  final String? error;

  const OptimisticResult({
    required this.success,
    this.data,
    this.updateId,
    this.error,
  });
}

/// Manages optimistic updates with automatic rollback
class OptimisticUpdateManager {
  final Map<String, OptimisticUpdate<dynamic>> _pendingUpdates = {};
  final _updateController = StreamController<List<OptimisticUpdate>>.broadcast();

  Stream<List<OptimisticUpdate>> get updatesStream => _updateController.stream;
  List<OptimisticUpdate> get pendingUpdates => _pendingUpdates.values.toList();

  /// Timeout for confirming updates
  final Duration confirmTimeout;

  /// Callback for when an update needs to be rolled back
  final Future<void> Function(String table, String recordId, dynamic previousValue)? onRollback;

  OptimisticUpdateManager({
    this.confirmTimeout = const Duration(seconds: 30),
    this.onRollback,
  });

  /// Apply an optimistic update
  Future<OptimisticResult<T>> apply<T>({
    required String table,
    required String recordId,
    required T previousValue,
    required T optimisticValue,
    required Future<T> Function() serverOperation,
    required Future<void> Function(T) localUpdate,
  }) async {
    final updateId = '\${table}_\${recordId}_\${DateTime.now().millisecondsSinceEpoch}';

    final update = OptimisticUpdate<T>(
      id: updateId,
      table: table,
      recordId: recordId,
      previousValue: previousValue,
      optimisticValue: optimisticValue,
      createdAt: DateTime.now(),
    );

    // Store pending update
    _pendingUpdates[updateId] = update;
    _notifyListeners();

    try {
      // Apply optimistic update locally
      await localUpdate(optimisticValue);

      // Start server operation with timeout
      final serverResult = await serverOperation().timeout(
        confirmTimeout,
        onTimeout: () => throw TimeoutException('Server operation timed out'),
      );

      // Confirm the update
      await confirm(updateId);

      return OptimisticResult(
        success: true,
        data: serverResult,
        updateId: updateId,
      );
    } catch (e) {
      // Rollback on failure
      await rollback(updateId);

      return OptimisticResult(
        success: false,
        updateId: updateId,
        error: e.toString(),
      );
    }
  }

  /// Confirm an optimistic update was successful
  Future<void> confirm(String updateId) async {
    final update = _pendingUpdates[updateId];
    if (update == null) return;

    _pendingUpdates[updateId] = update.copyWith(
      status: OptimisticUpdateStatus.confirmed,
    );

    // Remove after short delay to allow UI to reflect confirmed state
    Future.delayed(const Duration(seconds: 1), () {
      _pendingUpdates.remove(updateId);
      _notifyListeners();
    });

    _notifyListeners();
  }

  /// Rollback an optimistic update
  Future<void> rollback(String updateId) async {
    final update = _pendingUpdates[updateId];
    if (update == null) return;

    // Update status
    _pendingUpdates[updateId] = update.copyWith(
      status: OptimisticUpdateStatus.rolledBack,
    );
    _notifyListeners();

    // Perform rollback
    if (onRollback != null) {
      await onRollback!(update.table, update.recordId, update.previousValue);
    }

    // Remove after short delay
    Future.delayed(const Duration(seconds: 2), () {
      _pendingUpdates.remove(updateId);
      _notifyListeners();
    });
  }

  /// Mark an update as syncing
  void markSyncing(String updateId) {
    final update = _pendingUpdates[updateId];
    if (update == null) return;

    _pendingUpdates[updateId] = update.copyWith(
      status: OptimisticUpdateStatus.syncing,
    );
    _notifyListeners();
  }

  /// Mark an update as failed
  void markFailed(String updateId, String error) {
    final update = _pendingUpdates[updateId];
    if (update == null) return;

    _pendingUpdates[updateId] = update.copyWith(
      status: OptimisticUpdateStatus.failed,
      errorMessage: error,
    );
    _notifyListeners();
  }

  /// Get update status
  OptimisticUpdateStatus? getStatus(String updateId) {
    return _pendingUpdates[updateId]?.status;
  }

  /// Check if there are pending updates for a record
  bool hasPendingUpdate(String table, String recordId) {
    return _pendingUpdates.values.any((u) =>
        u.table == table &&
        u.recordId == recordId &&
        u.status == OptimisticUpdateStatus.pending);
  }

  /// Get all pending updates for a table
  List<OptimisticUpdate> getPendingForTable(String table) {
    return _pendingUpdates.values
        .where((u) => u.table == table && u.status == OptimisticUpdateStatus.pending)
        .toList();
  }

  void _notifyListeners() {
    _updateController.add(pendingUpdates);
  }

  void dispose() {
    _updateController.close();
  }
}

/// Mixin for optimistic update support in repositories
mixin OptimisticMixin<T> {
  OptimisticUpdateManager get updateManager;

  /// Perform an optimistic create
  Future<OptimisticResult<T>> optimisticCreate({
    required T optimisticData,
    required String recordId,
    required Future<T> Function() createOnServer,
    required Future<void> Function(T) createLocally,
  }) async {
    return updateManager.apply<T>(
      table: tableName,
      recordId: recordId,
      previousValue: null as T,
      optimisticValue: optimisticData,
      serverOperation: createOnServer,
      localUpdate: createLocally,
    );
  }

  /// Perform an optimistic update
  Future<OptimisticResult<T>> optimisticUpdate({
    required T previousData,
    required T optimisticData,
    required String recordId,
    required Future<T> Function() updateOnServer,
    required Future<void> Function(T) updateLocally,
  }) async {
    return updateManager.apply<T>(
      table: tableName,
      recordId: recordId,
      previousValue: previousData,
      optimisticValue: optimisticData,
      serverOperation: updateOnServer,
      localUpdate: updateLocally,
    );
  }

  /// Perform an optimistic delete
  Future<OptimisticResult<T>> optimisticDelete({
    required T previousData,
    required String recordId,
    required Future<void> Function() deleteOnServer,
    required Future<void> Function() deleteLocally,
  }) async {
    return updateManager.apply<T>(
      table: tableName,
      recordId: recordId,
      previousValue: previousData,
      optimisticValue: null as T,
      serverOperation: () async {
        await deleteOnServer();
        return null as T;
      },
      localUpdate: (_) => deleteLocally(),
    );
  }

  String get tableName;
}
`,
  output: {
    path: "lib/core/sync",
    filename: "optimistic_update_manager",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// RETRY POLICY TEMPLATE (Template 5)
// ============================================================================

export const RETRY_POLICY_TEMPLATE: Template = {
  id: "drift-retry-policy",
  name: "Drift Retry Policy",
  description: "Configurable retry policies for failed sync operations",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Retry Policy Manager

import 'dart:async';
import 'dart:math' as math;

/// Retry strategy types
enum RetryStrategy {
  /// Fixed delay between retries
  fixed,

  /// Exponential backoff (delay doubles each retry)
  exponentialBackoff,

  /// Linear backoff (delay increases linearly)
  linearBackoff,

  /// Fibonacci backoff
  fibonacciBackoff,

  /// Custom strategy
  custom,
}

/// Configuration for retry behavior
class RetryConfig {
  final RetryStrategy strategy;
  final int maxRetries;
  final Duration initialDelay;
  final Duration maxDelay;
  final double backoffMultiplier;
  final bool addJitter;
  final double jitterFactor;
  final Set<Type> retryableExceptions;
  final bool Function(dynamic error)? shouldRetry;

  const RetryConfig({
    this.strategy = RetryStrategy.exponentialBackoff,
    this.maxRetries = {{config.retry.maxRetries}},
    this.initialDelay = const Duration(seconds: {{config.retry.initialDelaySeconds}}),
    this.maxDelay = const Duration(seconds: {{config.retry.maxDelaySeconds}}),
    this.backoffMultiplier = 2.0,
    this.addJitter = true,
    this.jitterFactor = 0.2,
    this.retryableExceptions = const {},
    this.shouldRetry,
  });

  RetryConfig copyWith({
    RetryStrategy? strategy,
    int? maxRetries,
    Duration? initialDelay,
    Duration? maxDelay,
    double? backoffMultiplier,
    bool? addJitter,
    double? jitterFactor,
  }) {
    return RetryConfig(
      strategy: strategy ?? this.strategy,
      maxRetries: maxRetries ?? this.maxRetries,
      initialDelay: initialDelay ?? this.initialDelay,
      maxDelay: maxDelay ?? this.maxDelay,
      backoffMultiplier: backoffMultiplier ?? this.backoffMultiplier,
      addJitter: addJitter ?? this.addJitter,
      jitterFactor: jitterFactor ?? this.jitterFactor,
      retryableExceptions: retryableExceptions,
      shouldRetry: shouldRetry,
    );
  }
}

/// Information about a retry attempt
class RetryAttempt {
  final int attemptNumber;
  final int maxAttempts;
  final Duration delay;
  final DateTime scheduledAt;
  final dynamic lastError;

  const RetryAttempt({
    required this.attemptNumber,
    required this.maxAttempts,
    required this.delay,
    required this.scheduledAt,
    this.lastError,
  });

  bool get isLastAttempt => attemptNumber >= maxAttempts;
  int get remainingAttempts => maxAttempts - attemptNumber;
}

/// Result of a retryable operation
class RetryResult<T> {
  final bool success;
  final T? result;
  final int attempts;
  final Duration totalDuration;
  final List<dynamic> errors;

  const RetryResult({
    required this.success,
    this.result,
    required this.attempts,
    required this.totalDuration,
    this.errors = const [],
  });
}

/// Manages retry logic for failed operations
class RetryPolicy {
  final RetryConfig config;
  final _random = math.Random();

  RetryPolicy({RetryConfig? config}) : config = config ?? const RetryConfig();

  /// Execute an operation with retry logic
  Future<RetryResult<T>> execute<T>(
    Future<T> Function() operation, {
    void Function(RetryAttempt)? onRetry,
    RetryConfig? customConfig,
  }) async {
    final cfg = customConfig ?? config;
    final errors = <dynamic>[];
    final startTime = DateTime.now();
    int attempt = 0;

    while (attempt < cfg.maxRetries) {
      attempt++;

      try {
        final result = await operation();
        return RetryResult(
          success: true,
          result: result,
          attempts: attempt,
          totalDuration: DateTime.now().difference(startTime),
          errors: errors,
        );
      } catch (e) {
        errors.add(e);

        // Check if we should retry
        if (!_shouldRetry(e, cfg)) {
          return RetryResult(
            success: false,
            attempts: attempt,
            totalDuration: DateTime.now().difference(startTime),
            errors: errors,
          );
        }

        // Check if we've exhausted retries
        if (attempt >= cfg.maxRetries) {
          break;
        }

        // Calculate delay
        final delay = _calculateDelay(attempt, cfg);

        // Notify listener
        if (onRetry != null) {
          onRetry(RetryAttempt(
            attemptNumber: attempt,
            maxAttempts: cfg.maxRetries,
            delay: delay,
            scheduledAt: DateTime.now(),
            lastError: e,
          ));
        }

        // Wait before retrying
        await Future.delayed(delay);
      }
    }

    return RetryResult(
      success: false,
      attempts: attempt,
      totalDuration: DateTime.now().difference(startTime),
      errors: errors,
    );
  }

  bool _shouldRetry(dynamic error, RetryConfig cfg) {
    // Custom retry check
    if (cfg.shouldRetry != null) {
      return cfg.shouldRetry!(error);
    }

    // Check if error type is retryable
    if (cfg.retryableExceptions.isNotEmpty) {
      return cfg.retryableExceptions.any((type) => error.runtimeType == type);
    }

    // Default: retry on all errors except specific ones
    if (error is ArgumentError || error is StateError) {
      return false;
    }

    return true;
  }

  Duration _calculateDelay(int attempt, RetryConfig cfg) {
    Duration baseDelay;

    switch (cfg.strategy) {
      case RetryStrategy.fixed:
        baseDelay = cfg.initialDelay;
        break;

      case RetryStrategy.exponentialBackoff:
        baseDelay = cfg.initialDelay *
            math.pow(cfg.backoffMultiplier, attempt - 1).toInt();
        break;

      case RetryStrategy.linearBackoff:
        baseDelay = cfg.initialDelay * attempt;
        break;

      case RetryStrategy.fibonacciBackoff:
        baseDelay = cfg.initialDelay * _fibonacci(attempt);
        break;

      case RetryStrategy.custom:
        baseDelay = cfg.initialDelay;
        break;
    }

    // Apply max delay cap
    if (baseDelay > cfg.maxDelay) {
      baseDelay = cfg.maxDelay;
    }

    // Add jitter if enabled
    if (cfg.addJitter) {
      final jitter = baseDelay.inMilliseconds * cfg.jitterFactor;
      final jitterOffset = (_random.nextDouble() * 2 - 1) * jitter;
      baseDelay = Duration(
        milliseconds: (baseDelay.inMilliseconds + jitterOffset).round(),
      );
    }

    return baseDelay;
  }

  int _fibonacci(int n) {
    if (n <= 1) return n;
    int a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
      final temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }
}

/// Retry policy presets
class RetryPresets {
  /// Aggressive retry for critical operations
  static const aggressive = RetryConfig(
    strategy: RetryStrategy.exponentialBackoff,
    maxRetries: 10,
    initialDelay: Duration(milliseconds: 500),
    maxDelay: Duration(seconds: 30),
    backoffMultiplier: 1.5,
  );

  /// Conservative retry for non-critical operations
  static const conservative = RetryConfig(
    strategy: RetryStrategy.exponentialBackoff,
    maxRetries: 3,
    initialDelay: Duration(seconds: 2),
    maxDelay: Duration(seconds: 30),
  );

  /// Quick retry for fast operations
  static const quick = RetryConfig(
    strategy: RetryStrategy.fixed,
    maxRetries: 5,
    initialDelay: Duration(milliseconds: 200),
  );

  /// Background sync retry
  static const backgroundSync = RetryConfig(
    strategy: RetryStrategy.exponentialBackoff,
    maxRetries: 5,
    initialDelay: Duration(seconds: 5),
    maxDelay: Duration(minutes: 5),
    addJitter: true,
  );
}

/// Mixin for adding retry capability to services
mixin RetryMixin {
  RetryPolicy get retryPolicy;

  Future<T> withRetry<T>(
    Future<T> Function() operation, {
    RetryConfig? config,
    void Function(RetryAttempt)? onRetry,
  }) async {
    final result = await retryPolicy.execute(
      operation,
      customConfig: config,
      onRetry: onRetry,
    );

    if (result.success) {
      return result.result as T;
    }

    throw RetryExhaustedException(
      attempts: result.attempts,
      errors: result.errors,
    );
  }
}

/// Exception thrown when all retries are exhausted
class RetryExhaustedException implements Exception {
  final int attempts;
  final List<dynamic> errors;

  const RetryExhaustedException({
    required this.attempts,
    required this.errors,
  });

  @override
  String toString() =>
      'RetryExhaustedException: Failed after \$attempts attempts. Last error: \${errors.lastOrNull}';
}
`,
  output: {
    path: "lib/core/sync",
    filename: "retry_policy",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// TIER 2: PERFORMANCE & SCALABILITY
// ============================================================================

// ============================================================================
// PAGINATION TEMPLATE (Template 6)
// ============================================================================

export const PAGINATION_TEMPLATE: Template = {
  id: "drift-pagination",
  name: "Drift Pagination",
  description: "Efficient pagination for large datasets",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Pagination Manager

import 'dart:async';
import 'package:drift/drift.dart';

/// Pagination mode
enum PaginationMode {
  /// Offset-based (OFFSET/LIMIT)
  offset,

  /// Cursor-based (WHERE id > cursor LIMIT)
  cursor,

  /// Keyset pagination (most efficient for large datasets)
  keyset,
}

/// A page of data
class Page<T> {
  final List<T> items;
  final int pageNumber;
  final int pageSize;
  final int? totalItems;
  final int? totalPages;
  final bool hasNextPage;
  final bool hasPreviousPage;
  final String? nextCursor;
  final String? previousCursor;

  const Page({
    required this.items,
    required this.pageNumber,
    required this.pageSize,
    this.totalItems,
    this.totalPages,
    required this.hasNextPage,
    required this.hasPreviousPage,
    this.nextCursor,
    this.previousCursor,
  });

  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;
  int get itemCount => items.length;

  /// Check if this is the first page
  bool get isFirstPage => pageNumber == 1;

  /// Check if this is the last page
  bool get isLastPage => !hasNextPage;
}

/// Request for a page of data
class PageRequest {
  final int page;
  final int pageSize;
  final String? cursor;
  final String? sortBy;
  final bool ascending;

  const PageRequest({
    this.page = 1,
    this.pageSize = {{config.pagination.defaultPageSize}},
    this.cursor,
    this.sortBy,
    this.ascending = true,
  });

  PageRequest copyWith({
    int? page,
    int? pageSize,
    String? cursor,
    String? sortBy,
    bool? ascending,
  }) {
    return PageRequest(
      page: page ?? this.page,
      pageSize: pageSize ?? this.pageSize,
      cursor: cursor ?? this.cursor,
      sortBy: sortBy ?? this.sortBy,
      ascending: ascending ?? this.ascending,
    );
  }

  /// Get the next page request
  PageRequest get next => copyWith(page: page + 1);

  /// Get the previous page request
  PageRequest get previous => copyWith(page: page > 1 ? page - 1 : 1);

  /// Calculate offset for offset-based pagination
  int get offset => (page - 1) * pageSize;
}

/// Manages pagination for database queries
class PaginationManager<T, D extends DatabaseConnectionUser> {
  final D database;
  final PaginationMode mode;
  final int maxPageSize;

  PaginationManager({
    required this.database,
    this.mode = PaginationMode.offset,
    this.maxPageSize = {{config.pagination.maxPageSize}},
  });

  /// Paginate a query
  Future<Page<T>> paginate({
    required Future<List<T>> Function(int limit, int offset) query,
    required PageRequest request,
    Future<int> Function()? countQuery,
  }) async {
    final pageSize = request.pageSize.clamp(1, maxPageSize);

    switch (mode) {
      case PaginationMode.offset:
        return _paginateOffset(query, request, pageSize, countQuery);
      case PaginationMode.cursor:
        return _paginateCursor(query, request, pageSize);
      case PaginationMode.keyset:
        return _paginateKeyset(query, request, pageSize);
    }
  }

  Future<Page<T>> _paginateOffset(
    Future<List<T>> Function(int limit, int offset) query,
    PageRequest request,
    int pageSize,
    Future<int> Function()? countQuery,
  ) async {
    // Fetch one extra to check if there's a next page
    final items = await query(pageSize + 1, request.offset);
    final hasNextPage = items.length > pageSize;
    final pageItems = hasNextPage ? items.take(pageSize).toList() : items;

    int? totalItems;
    int? totalPages;

    if (countQuery != null) {
      totalItems = await countQuery();
      totalPages = (totalItems / pageSize).ceil();
    }

    return Page(
      items: pageItems,
      pageNumber: request.page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages,
      hasNextPage: hasNextPage,
      hasPreviousPage: request.page > 1,
    );
  }

  Future<Page<T>> _paginateCursor(
    Future<List<T>> Function(int limit, int offset) query,
    PageRequest request,
    int pageSize,
  ) async {
    // Cursor-based pagination uses the cursor as a reference point
    final items = await query(pageSize + 1, 0);
    final hasNextPage = items.length > pageSize;
    final pageItems = hasNextPage ? items.take(pageSize).toList() : items;

    return Page(
      items: pageItems,
      pageNumber: request.page,
      pageSize: pageSize,
      hasNextPage: hasNextPage,
      hasPreviousPage: request.cursor != null,
      nextCursor: hasNextPage ? _extractCursor(pageItems.last) : null,
    );
  }

  Future<Page<T>> _paginateKeyset(
    Future<List<T>> Function(int limit, int offset) query,
    PageRequest request,
    int pageSize,
  ) async {
    // Keyset pagination is the most efficient for large datasets
    // It uses the last item's key to fetch the next page
    return _paginateCursor(query, request, pageSize);
  }

  String? _extractCursor(T item) {
    // Override this to extract cursor from your data type
    return item.hashCode.toString();
  }
}

/// Infinite scroll controller for UI
class InfiniteScrollController<T> {
  final Future<Page<T>> Function(PageRequest) fetchPage;
  final int pageSize;
  final bool prefetchNextPage;

  final _itemsController = StreamController<List<T>>.broadcast();
  final _loadingController = StreamController<bool>.broadcast();
  final _errorController = StreamController<String?>.broadcast();

  List<T> _items = [];
  PageRequest _currentRequest;
  bool _isLoading = false;
  bool _hasMore = true;
  String? _lastError;

  InfiniteScrollController({
    required this.fetchPage,
    this.pageSize = {{config.pagination.defaultPageSize}},
    this.prefetchNextPage = true,
  }) : _currentRequest = PageRequest(pageSize: pageSize);

  Stream<List<T>> get itemsStream => _itemsController.stream;
  Stream<bool> get loadingStream => _loadingController.stream;
  Stream<String?> get errorStream => _errorController.stream;

  List<T> get items => _items;
  bool get isLoading => _isLoading;
  bool get hasMore => _hasMore;
  String? get lastError => _lastError;

  /// Load the initial page
  Future<void> loadInitial() async {
    _items = [];
    _currentRequest = PageRequest(pageSize: pageSize);
    _hasMore = true;
    await _loadPage();
  }

  /// Load the next page
  Future<void> loadNext() async {
    if (_isLoading || !_hasMore) return;
    _currentRequest = _currentRequest.next;
    await _loadPage();
  }

  /// Refresh the list
  Future<void> refresh() async {
    await loadInitial();
  }

  Future<void> _loadPage() async {
    if (_isLoading) return;

    _isLoading = true;
    _lastError = null;
    _loadingController.add(true);

    try {
      final page = await fetchPage(_currentRequest);

      _items = [..._items, ...page.items];
      _hasMore = page.hasNextPage;

      _itemsController.add(_items);
    } catch (e) {
      _lastError = e.toString();
      _errorController.add(_lastError);
    } finally {
      _isLoading = false;
      _loadingController.add(false);
    }
  }

  /// Check if we should load more (for scroll listener)
  bool shouldLoadMore(double scrollPosition, double maxScrollExtent) {
    if (_isLoading || !_hasMore) return false;
    final threshold = maxScrollExtent * 0.8;
    return scrollPosition >= threshold;
  }

  void dispose() {
    _itemsController.close();
    _loadingController.close();
    _errorController.close();
  }
}

/// Extension for paginated queries on DAOs
extension PaginatedQueries<T extends Table, D extends DataClass>
    on TableInfo<T, D> {
  /// Get a paginated result
  Future<Page<D>> paginated(
    DatabaseConnectionUser db,
    PageRequest request, {
    Expression<bool>? where,
    List<OrderingTerm>? orderBy,
  }) async {
    var query = db.select(this);

    if (where != null) {
      query = query..where((_) => where);
    }

    if (orderBy != null) {
      query = query..orderBy(orderBy);
    }

    final items = await (query
      ..limit(request.pageSize + 1, offset: request.offset))
        .get();

    final hasNextPage = items.length > request.pageSize;
    final pageItems = hasNextPage
        ? items.take(request.pageSize).toList()
        : items;

    return Page(
      items: pageItems,
      pageNumber: request.page,
      pageSize: request.pageSize,
      hasNextPage: hasNextPage,
      hasPreviousPage: request.page > 1,
    );
  }
}
`,
  output: {
    path: "lib/core/data",
    filename: "pagination",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// LAZY LOADING TEMPLATE (Template 7)
// ============================================================================

export const LAZY_LOADING_TEMPLATE: Template = {
  id: "drift-lazy-loading",
  name: "Drift Lazy Loading",
  description: "Lazy loading for related entities and large datasets",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Lazy Loading Manager

import 'dart:async';
import 'package:flutter/foundation.dart';

/// Lazy loading state
enum LazyState {
  initial,
  loading,
  loaded,
  error,
}

/// A lazily loaded value
class Lazy<T> {
  T? _value;
  Object? _error;
  LazyState _state = LazyState.initial;
  final Future<T> Function() _loader;
  final Duration? cacheFor;
  DateTime? _loadedAt;

  Lazy(this._loader, {this.cacheFor});

  LazyState get state => _state;
  bool get isLoaded => _state == LazyState.loaded;
  bool get isLoading => _state == LazyState.loading;
  bool get hasError => _state == LazyState.error;
  Object? get error => _error;

  /// Check if cache has expired
  bool get isCacheExpired {
    if (cacheFor == null || _loadedAt == null) return false;
    return DateTime.now().difference(_loadedAt!) > cacheFor!;
  }

  /// Get the value, loading it if necessary
  Future<T> get() async {
    if (_state == LazyState.loaded && !isCacheExpired) {
      return _value as T;
    }

    if (_state == LazyState.loading) {
      // Wait for the current load to complete
      while (_state == LazyState.loading) {
        await Future.delayed(const Duration(milliseconds: 10));
      }
      if (_state == LazyState.loaded) {
        return _value as T;
      }
      throw _error!;
    }

    return _load();
  }

  Future<T> _load() async {
    _state = LazyState.loading;
    try {
      _value = await _loader();
      _state = LazyState.loaded;
      _loadedAt = DateTime.now();
      return _value as T;
    } catch (e) {
      _error = e;
      _state = LazyState.error;
      rethrow;
    }
  }

  /// Force reload the value
  Future<T> reload() async {
    _state = LazyState.initial;
    return get();
  }

  /// Reset to initial state
  void reset() {
    _value = null;
    _error = null;
    _state = LazyState.initial;
    _loadedAt = null;
  }

  /// Get the value synchronously if loaded, otherwise return null
  T? getSync() => isLoaded ? _value : null;
}

/// A lazy list that loads items on demand
class LazyList<T> {
  final Future<List<T>> Function(int offset, int limit) _loader;
  final int _pageSize;
  final List<T?> _items = [];
  final Set<int> _loadingPages = {};
  int? _totalCount;

  LazyList(
    this._loader, {
    int pageSize = {{config.lazyLoading.pageSize}},
  }) : _pageSize = pageSize;

  int get length => _totalCount ?? _items.length;
  int get loadedCount => _items.where((i) => i != null).length;
  bool get isFullyLoaded => _totalCount != null && loadedCount >= _totalCount!;

  /// Get item at index, loading if necessary
  Future<T?> get(int index) async {
    // Expand list if needed
    while (_items.length <= index) {
      _items.add(null);
    }

    // Return if already loaded
    if (_items[index] != null) {
      return _items[index];
    }

    // Load the page containing this index
    final pageIndex = index ~/ _pageSize;
    await _loadPage(pageIndex);

    return _items[index];
  }

  /// Get item synchronously if loaded
  T? getSync(int index) {
    if (index < _items.length) {
      return _items[index];
    }
    return null;
  }

  Future<void> _loadPage(int pageIndex) async {
    if (_loadingPages.contains(pageIndex)) return;

    _loadingPages.add(pageIndex);
    try {
      final offset = pageIndex * _pageSize;
      final items = await _loader(offset, _pageSize);

      // Expand list if needed
      while (_items.length < offset + items.length) {
        _items.add(null);
      }

      // Set items
      for (var i = 0; i < items.length; i++) {
        _items[offset + i] = items[i];
      }

      // Update total count if we got less than requested
      if (items.length < _pageSize) {
        _totalCount = offset + items.length;
      }
    } finally {
      _loadingPages.remove(pageIndex);
    }
  }

  /// Preload a range of items
  Future<void> preload(int start, int end) async {
    final startPage = start ~/ _pageSize;
    final endPage = end ~/ _pageSize;

    await Future.wait([
      for (var i = startPage; i <= endPage; i++) _loadPage(i)
    ]);
  }

  /// Reset and clear all loaded items
  void reset() {
    _items.clear();
    _loadingPages.clear();
    _totalCount = null;
  }

  /// Get all currently loaded items
  List<T> get loadedItems => _items.whereType<T>().toList();
}

/// Lazy relationship loader for entity relations
class LazyRelation<T> {
  final Future<T> Function() _loader;
  Lazy<T>? _lazy;
  final Duration? cacheFor;

  LazyRelation(this._loader, {this.cacheFor});

  /// Check if the relation is loaded
  bool get isLoaded => _lazy?.isLoaded ?? false;

  /// Get the related entity
  Future<T> get() {
    _lazy ??= Lazy(_loader, cacheFor: cacheFor);
    return _lazy!.get();
  }

  /// Get synchronously if loaded
  T? getSync() => _lazy?.getSync();

  /// Force reload
  Future<T> reload() {
    _lazy = Lazy(_loader, cacheFor: cacheFor);
    return _lazy!.get();
  }

  /// Reset the relation
  void reset() {
    _lazy = null;
  }
}

/// Lazy collection loader for one-to-many relations
class LazyCollection<T> {
  final Future<List<T>> Function() _loader;
  Lazy<List<T>>? _lazy;
  final Duration? cacheFor;

  LazyCollection(this._loader, {this.cacheFor});

  /// Check if the collection is loaded
  bool get isLoaded => _lazy?.isLoaded ?? false;

  /// Get the collection
  Future<List<T>> get() {
    _lazy ??= Lazy(_loader, cacheFor: cacheFor);
    return _lazy!.get();
  }

  /// Get synchronously if loaded
  List<T>? getSync() => _lazy?.getSync();

  /// Get count without loading all items
  Future<int> get count async {
    final items = await get();
    return items.length;
  }

  /// Force reload
  Future<List<T>> reload() {
    _lazy = Lazy(_loader, cacheFor: cacheFor);
    return _lazy!.get();
  }

  /// Reset the collection
  void reset() {
    _lazy = null;
  }
}

/// Mixin for entities with lazy-loaded relations
mixin LazyLoadable {
  final Map<String, dynamic> _lazyRelations = {};

  /// Register a lazy relation
  LazyRelation<T> lazyOne<T>(String name, Future<T> Function() loader) {
    return _lazyRelations.putIfAbsent(
      name,
      () => LazyRelation<T>(loader),
    ) as LazyRelation<T>;
  }

  /// Register a lazy collection
  LazyCollection<T> lazyMany<T>(String name, Future<List<T>> Function() loader) {
    return _lazyRelations.putIfAbsent(
      name,
      () => LazyCollection<T>(loader),
    ) as LazyCollection<T>;
  }

  /// Reset all lazy relations
  void resetLazyRelations() {
    for (final relation in _lazyRelations.values) {
      if (relation is LazyRelation) {
        relation.reset();
      } else if (relation is LazyCollection) {
        relation.reset();
      }
    }
  }
}
`,
  output: {
    path: "lib/core/data",
    filename: "lazy_loading",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// QUERY CACHE TEMPLATE (Template 8)
// ============================================================================

export const QUERY_CACHE_TEMPLATE: Template = {
  id: "drift-query-cache",
  name: "Drift Query Cache",
  description: "In-memory query result caching with TTL and invalidation",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Query Cache Manager

import 'dart:async';
import 'dart:collection';

/// Cache entry with metadata
class CacheEntry<T> {
  final T data;
  final DateTime createdAt;
  final DateTime expiresAt;
  final Set<String> tags;
  int accessCount;
  DateTime lastAccessedAt;

  CacheEntry({
    required this.data,
    required this.createdAt,
    required this.expiresAt,
    this.tags = const {},
  })  : accessCount = 0,
        lastAccessedAt = createdAt;

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  void recordAccess() {
    accessCount++;
    lastAccessedAt = DateTime.now();
  }
}

/// Cache eviction policy
enum EvictionPolicy {
  /// Least Recently Used
  lru,

  /// Least Frequently Used
  lfu,

  /// First In First Out
  fifo,

  /// Time To Live only
  ttlOnly,
}

/// Cache statistics
class CacheStats {
  int hits = 0;
  int misses = 0;
  int evictions = 0;
  int expirations = 0;
  int invalidations = 0;

  double get hitRate => hits + misses > 0 ? hits / (hits + misses) : 0;

  void reset() {
    hits = 0;
    misses = 0;
    evictions = 0;
    expirations = 0;
    invalidations = 0;
  }

  @override
  String toString() =>
      'CacheStats(hits: \$hits, misses: \$misses, hitRate: \${(hitRate * 100).toStringAsFixed(1)}%)';
}

/// Query cache configuration
class QueryCacheConfig {
  final int maxSize;
  final Duration defaultTtl;
  final EvictionPolicy evictionPolicy;
  final bool enableStats;

  const QueryCacheConfig({
    this.maxSize = {{config.queryCache.maxSize}},
    this.defaultTtl = const Duration(minutes: {{config.queryCache.defaultTtlMinutes}}),
    this.evictionPolicy = EvictionPolicy.lru,
    this.enableStats = true,
  });
}

/// In-memory cache for query results
class QueryCache {
  final QueryCacheConfig config;
  final LinkedHashMap<String, CacheEntry<dynamic>> _cache = LinkedHashMap();
  final Map<String, Set<String>> _tagToKeys = {};
  final CacheStats stats = CacheStats();
  Timer? _cleanupTimer;

  QueryCache({QueryCacheConfig? config})
      : config = config ?? const QueryCacheConfig() {
    // Start periodic cleanup
    _cleanupTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _cleanup(),
    );
  }

  /// Get cached value or execute query
  Future<T> getOrFetch<T>(
    String key,
    Future<T> Function() fetch, {
    Duration? ttl,
    Set<String>? tags,
  }) async {
    final entry = _cache[key];

    if (entry != null && !entry.isExpired) {
      entry.recordAccess();
      if (config.enableStats) stats.hits++;
      return entry.data as T;
    }

    if (config.enableStats && entry != null) {
      stats.expirations++;
    } else {
      stats.misses++;
    }

    final data = await fetch();
    set(key, data, ttl: ttl, tags: tags);
    return data;
  }

  /// Get cached value
  T? get<T>(String key) {
    final entry = _cache[key];

    if (entry == null) {
      if (config.enableStats) stats.misses++;
      return null;
    }

    if (entry.isExpired) {
      _remove(key);
      if (config.enableStats) stats.expirations++;
      return null;
    }

    entry.recordAccess();
    if (config.enableStats) stats.hits++;
    return entry.data as T;
  }

  /// Set cached value
  void set<T>(
    String key,
    T data, {
    Duration? ttl,
    Set<String>? tags,
  }) {
    // Check capacity and evict if needed
    while (_cache.length >= config.maxSize) {
      _evict();
    }

    final now = DateTime.now();
    final entry = CacheEntry<T>(
      data: data,
      createdAt: now,
      expiresAt: now.add(ttl ?? config.defaultTtl),
      tags: tags ?? {},
    );

    _cache[key] = entry;

    // Index by tags
    for (final tag in entry.tags) {
      _tagToKeys.putIfAbsent(tag, () => {}).add(key);
    }
  }

  /// Invalidate by key
  void invalidate(String key) {
    if (_remove(key)) {
      if (config.enableStats) stats.invalidations++;
    }
  }

  /// Invalidate by tag
  void invalidateByTag(String tag) {
    final keys = _tagToKeys.remove(tag);
    if (keys != null) {
      for (final key in keys) {
        _remove(key);
        if (config.enableStats) stats.invalidations++;
      }
    }
  }

  /// Invalidate by pattern
  void invalidateByPattern(RegExp pattern) {
    final keysToRemove = _cache.keys.where((k) => pattern.hasMatch(k)).toList();
    for (final key in keysToRemove) {
      _remove(key);
      if (config.enableStats) stats.invalidations++;
    }
  }

  /// Invalidate all entries for a table
  void invalidateTable(String tableName) {
    invalidateByPattern(RegExp('^$tableName:'));
    invalidateByTag(tableName);
  }

  /// Clear all cache
  void clear() {
    _cache.clear();
    _tagToKeys.clear();
  }

  bool _remove(String key) {
    final entry = _cache.remove(key);
    if (entry != null) {
      for (final tag in entry.tags) {
        _tagToKeys[tag]?.remove(key);
      }
      return true;
    }
    return false;
  }

  void _evict() {
    if (_cache.isEmpty) return;

    String keyToEvict;

    switch (config.evictionPolicy) {
      case EvictionPolicy.lru:
        keyToEvict = _findLruKey();
        break;
      case EvictionPolicy.lfu:
        keyToEvict = _findLfuKey();
        break;
      case EvictionPolicy.fifo:
        keyToEvict = _cache.keys.first;
        break;
      case EvictionPolicy.ttlOnly:
        keyToEvict = _findOldestKey();
        break;
    }

    _remove(keyToEvict);
    if (config.enableStats) stats.evictions++;
  }

  String _findLruKey() {
    return _cache.entries
        .reduce((a, b) =>
            a.value.lastAccessedAt.isBefore(b.value.lastAccessedAt) ? a : b)
        .key;
  }

  String _findLfuKey() {
    return _cache.entries
        .reduce((a, b) => a.value.accessCount < b.value.accessCount ? a : b)
        .key;
  }

  String _findOldestKey() {
    return _cache.entries
        .reduce((a, b) =>
            a.value.createdAt.isBefore(b.value.createdAt) ? a : b)
        .key;
  }

  void _cleanup() {
    final expiredKeys = _cache.entries
        .where((e) => e.value.isExpired)
        .map((e) => e.key)
        .toList();

    for (final key in expiredKeys) {
      _remove(key);
      if (config.enableStats) stats.expirations++;
    }
  }

  /// Get cache size
  int get size => _cache.length;

  /// Get all keys
  Iterable<String> get keys => _cache.keys;

  void dispose() {
    _cleanupTimer?.cancel();
    clear();
  }
}

/// Mixin for cached queries in DAOs
mixin CachedQueries {
  QueryCache get queryCache;
  String get tableName;

  /// Generate cache key
  String cacheKey(String operation, [Map<String, dynamic>? params]) {
    final paramStr = params?.entries
        .map((e) => '\${e.key}=\${e.value}')
        .join('&') ?? '';
    return '\$tableName:\$operation:\$paramStr';
  }

  /// Cached query execution
  Future<T> cached<T>(
    String operation,
    Future<T> Function() query, {
    Map<String, dynamic>? params,
    Duration? ttl,
  }) {
    return queryCache.getOrFetch(
      cacheKey(operation, params),
      query,
      ttl: ttl,
      tags: {tableName},
    );
  }

  /// Invalidate all cached queries for this table
  void invalidateCache() {
    queryCache.invalidateTable(tableName);
  }
}
`,
  output: {
    path: "lib/core/data",
    filename: "query_cache",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// BATCH OPERATIONS TEMPLATE (Template 9)
// ============================================================================

export const BATCH_OPERATIONS_TEMPLATE: Template = {
  id: "drift-batch-operations",
  name: "Drift Batch Operations",
  description: "Efficient batch insert, update, and delete operations",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Batch Operations Manager

import 'dart:async';
import 'package:drift/drift.dart';

/// Result of a batch operation
class BatchResult {
  final int successCount;
  final int failureCount;
  final List<BatchError> errors;
  final Duration duration;

  const BatchResult({
    required this.successCount,
    required this.failureCount,
    this.errors = const [],
    required this.duration,
  });

  bool get isSuccess => failureCount == 0;
  int get totalCount => successCount + failureCount;

  @override
  String toString() =>
      'BatchResult(success: \$successCount, failed: \$failureCount, duration: \${duration.inMilliseconds}ms)';
}

/// Error during batch operation
class BatchError {
  final int index;
  final dynamic item;
  final String error;
  final StackTrace? stackTrace;

  const BatchError({
    required this.index,
    required this.item,
    required this.error,
    this.stackTrace,
  });
}

/// Batch operation configuration
class BatchConfig {
  final int batchSize;
  final bool useTransaction;
  final bool stopOnError;
  final int maxParallel;
  final Duration delayBetweenBatches;

  const BatchConfig({
    this.batchSize = {{config.batch.batchSize}},
    this.useTransaction = true,
    this.stopOnError = false,
    this.maxParallel = 1,
    this.delayBetweenBatches = Duration.zero,
  });
}

/// Progress callback for batch operations
typedef BatchProgressCallback = void Function(int processed, int total);

/// Manages batch database operations
class BatchOperations<D extends DatabaseConnectionUser> {
  final D database;
  final BatchConfig config;

  BatchOperations(this.database, {BatchConfig? config})
      : config = config ?? const BatchConfig();

  /// Batch insert with progress tracking
  Future<BatchResult> insertAll<T extends Table, R extends DataClass>(
    TableInfo<T, R> table,
    List<Insertable<R>> items, {
    InsertMode mode = InsertMode.insert,
    BatchProgressCallback? onProgress,
    BatchConfig? customConfig,
  }) async {
    final cfg = customConfig ?? config;
    final stopwatch = Stopwatch()..start();
    final errors = <BatchError>[];
    int successCount = 0;

    final batches = _splitIntoBatches(items, cfg.batchSize);
    int processed = 0;

    for (final batch in batches) {
      try {
        if (cfg.useTransaction) {
          await database.transaction(() async {
            for (var i = 0; i < batch.length; i++) {
              try {
                await database.into(table).insert(
                  batch[i],
                  mode: mode,
                );
                successCount++;
              } catch (e, st) {
                errors.add(BatchError(
                  index: processed + i,
                  item: batch[i],
                  error: e.toString(),
                  stackTrace: st,
                ));
                if (cfg.stopOnError) rethrow;
              }
            }
          });
        } else {
          await database.batch((b) {
            for (final item in batch) {
              b.insert(table, item, mode: mode);
            }
          });
          successCount += batch.length;
        }
      } catch (e, st) {
        if (cfg.stopOnError) {
          stopwatch.stop();
          return BatchResult(
            successCount: successCount,
            failureCount: items.length - successCount,
            errors: errors,
            duration: stopwatch.elapsed,
          );
        }
      }

      processed += batch.length;
      onProgress?.call(processed, items.length);

      if (cfg.delayBetweenBatches > Duration.zero && batches.last != batch) {
        await Future.delayed(cfg.delayBetweenBatches);
      }
    }

    stopwatch.stop();
    return BatchResult(
      successCount: successCount,
      failureCount: errors.length,
      errors: errors,
      duration: stopwatch.elapsed,
    );
  }

  /// Batch update with progress tracking
  Future<BatchResult> updateAll<T extends Table, R extends DataClass>(
    TableInfo<T, R> table,
    List<R> items, {
    BatchProgressCallback? onProgress,
    BatchConfig? customConfig,
  }) async {
    final cfg = customConfig ?? config;
    final stopwatch = Stopwatch()..start();
    final errors = <BatchError>[];
    int successCount = 0;

    final batches = _splitIntoBatches(items, cfg.batchSize);
    int processed = 0;

    for (final batch in batches) {
      if (cfg.useTransaction) {
        await database.transaction(() async {
          for (var i = 0; i < batch.length; i++) {
            try {
              await database.update(table).replace(batch[i]);
              successCount++;
            } catch (e, st) {
              errors.add(BatchError(
                index: processed + i,
                item: batch[i],
                error: e.toString(),
                stackTrace: st,
              ));
              if (cfg.stopOnError) rethrow;
            }
          }
        });
      } else {
        await database.batch((b) {
          for (final item in batch) {
            b.update(table, item);
          }
        });
        successCount += batch.length;
      }

      processed += batch.length;
      onProgress?.call(processed, items.length);

      if (cfg.delayBetweenBatches > Duration.zero && batches.last != batch) {
        await Future.delayed(cfg.delayBetweenBatches);
      }
    }

    stopwatch.stop();
    return BatchResult(
      successCount: successCount,
      failureCount: errors.length,
      errors: errors,
      duration: stopwatch.elapsed,
    );
  }

  /// Batch delete by IDs
  Future<BatchResult> deleteByIds<T extends Table, R extends DataClass>(
    TableInfo<T, R> table,
    List<int> ids, {
    required Expression<bool> Function(T table, int id) whereClause,
    BatchProgressCallback? onProgress,
    BatchConfig? customConfig,
  }) async {
    final cfg = customConfig ?? config;
    final stopwatch = Stopwatch()..start();
    final errors = <BatchError>[];
    int successCount = 0;

    final batches = _splitIntoBatches(ids, cfg.batchSize);
    int processed = 0;

    for (final batch in batches) {
      try {
        if (cfg.useTransaction) {
          await database.transaction(() async {
            for (var i = 0; i < batch.length; i++) {
              try {
                await (database.delete(table)
                  ..where((t) => whereClause(t, batch[i])))
                    .go();
                successCount++;
              } catch (e, st) {
                errors.add(BatchError(
                  index: processed + i,
                  item: batch[i],
                  error: e.toString(),
                  stackTrace: st,
                ));
                if (cfg.stopOnError) rethrow;
              }
            }
          });
        } else {
          // Use batch delete with IN clause for efficiency
          await database.batch((b) {
            for (final id in batch) {
              b.deleteWhere(table, (t) => whereClause(t, id));
            }
          });
          successCount += batch.length;
        }
      } catch (e) {
        if (cfg.stopOnError) {
          stopwatch.stop();
          return BatchResult(
            successCount: successCount,
            failureCount: ids.length - successCount,
            errors: errors,
            duration: stopwatch.elapsed,
          );
        }
      }

      processed += batch.length;
      onProgress?.call(processed, ids.length);
    }

    stopwatch.stop();
    return BatchResult(
      successCount: successCount,
      failureCount: errors.length,
      errors: errors,
      duration: stopwatch.elapsed,
    );
  }

  /// Batch upsert (insert or update)
  Future<BatchResult> upsertAll<T extends Table, R extends DataClass>(
    TableInfo<T, R> table,
    List<Insertable<R>> items, {
    BatchProgressCallback? onProgress,
    BatchConfig? customConfig,
  }) async {
    return insertAll(
      table,
      items,
      mode: InsertMode.insertOrReplace,
      onProgress: onProgress,
      customConfig: customConfig,
    );
  }

  List<List<T>> _splitIntoBatches<T>(List<T> items, int batchSize) {
    final batches = <List<T>>[];
    for (var i = 0; i < items.length; i += batchSize) {
      final end = (i + batchSize < items.length) ? i + batchSize : items.length;
      batches.add(items.sublist(i, end));
    }
    return batches;
  }
}

/// Extension for batch operations on tables
extension BatchTableExtension<T extends Table, D extends DataClass>
    on TableInfo<T, D> {
  /// Batch insert
  Future<BatchResult> batchInsert(
    DatabaseConnectionUser db,
    List<Insertable<D>> items, {
    BatchConfig? config,
    BatchProgressCallback? onProgress,
  }) {
    return BatchOperations(db, config: config)
        .insertAll(this, items, onProgress: onProgress);
  }

  /// Batch upsert
  Future<BatchResult> batchUpsert(
    DatabaseConnectionUser db,
    List<Insertable<D>> items, {
    BatchConfig? config,
    BatchProgressCallback? onProgress,
  }) {
    return BatchOperations(db, config: config)
        .upsertAll(this, items, onProgress: onProgress);
  }

  /// Batch update
  Future<BatchResult> batchUpdate(
    DatabaseConnectionUser db,
    List<D> items, {
    BatchConfig? config,
    BatchProgressCallback? onProgress,
  }) {
    return BatchOperations(db, config: config)
        .updateAll(this, items, onProgress: onProgress);
  }
}
`,
  output: {
    path: "lib/core/data",
    filename: "batch_operations",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// DATA COMPRESSION TEMPLATE (Template 10)
// ============================================================================

export const DATA_COMPRESSION_TEMPLATE: Template = {
  id: "drift-data-compression",
  name: "Drift Data Compression",
  description: "Compress large text and blob data for storage efficiency",
  type: "file",
  source: `// GENERATED CODE - DO NOT MODIFY BY HAND
// Data Compression Manager

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

/// Compression algorithm types
enum CompressionAlgorithm {
  gzip,
  zlib,
  none,
}

/// Compression level (0-9)
enum CompressionLevel {
  none(0),
  fast(1),
  low(3),
  medium(6),
  high(9);

  final int level;
  const CompressionLevel(this.level);
}

/// Result of a compression operation
class CompressionResult {
  final Uint8List data;
  final int originalSize;
  final int compressedSize;
  final CompressionAlgorithm algorithm;
  final Duration duration;

  const CompressionResult({
    required this.data,
    required this.originalSize,
    required this.compressedSize,
    required this.algorithm,
    required this.duration,
  });

  double get compressionRatio =>
      originalSize > 0 ? compressedSize / originalSize : 1.0;

  double get spaceSavings => 1.0 - compressionRatio;

  int get bytesSaved => originalSize - compressedSize;

  @override
  String toString() =>
      'CompressionResult(original: \$originalSize, compressed: \$compressedSize, ratio: \${(compressionRatio * 100).toStringAsFixed(1)}%)';
}

/// Compression statistics
class CompressionStats {
  int totalCompressed = 0;
  int totalDecompressed = 0;
  int totalBytesSaved = 0;
  int totalOriginalBytes = 0;
  int totalCompressedBytes = 0;
  Duration totalCompressionTime = Duration.zero;
  Duration totalDecompressionTime = Duration.zero;

  double get averageCompressionRatio => totalOriginalBytes > 0
      ? totalCompressedBytes / totalOriginalBytes
      : 1.0;

  void recordCompression(CompressionResult result) {
    totalCompressed++;
    totalBytesSaved += result.bytesSaved;
    totalOriginalBytes += result.originalSize;
    totalCompressedBytes += result.compressedSize;
    totalCompressionTime += result.duration;
  }

  void recordDecompression(Duration duration) {
    totalDecompressed++;
    totalDecompressionTime += duration;
  }

  void reset() {
    totalCompressed = 0;
    totalDecompressed = 0;
    totalBytesSaved = 0;
    totalOriginalBytes = 0;
    totalCompressedBytes = 0;
    totalCompressionTime = Duration.zero;
    totalDecompressionTime = Duration.zero;
  }

  @override
  String toString() =>
      'CompressionStats(compressed: \$totalCompressed, saved: \${(totalBytesSaved / 1024).toStringAsFixed(1)}KB, ratio: \${(averageCompressionRatio * 100).toStringAsFixed(1)}%)';
}

/// Configuration for data compression
class CompressionConfig {
  final CompressionAlgorithm algorithm;
  final CompressionLevel level;
  final int minSizeToCompress;
  final bool trackStats;

  const CompressionConfig({
    this.algorithm = CompressionAlgorithm.gzip,
    this.level = CompressionLevel.medium,
    this.minSizeToCompress = {{config.compression.minSizeBytes}},
    this.trackStats = true,
  });
}

/// Manages data compression for storage
class CompressionManager {
  final CompressionConfig config;
  final CompressionStats stats = CompressionStats();

  CompressionManager({CompressionConfig? config})
      : config = config ?? const CompressionConfig();

  /// Compress data
  CompressionResult compress(Uint8List data) {
    final stopwatch = Stopwatch()..start();

    // Skip compression for small data
    if (data.length < config.minSizeToCompress) {
      stopwatch.stop();
      return CompressionResult(
        data: data,
        originalSize: data.length,
        compressedSize: data.length,
        algorithm: CompressionAlgorithm.none,
        duration: stopwatch.elapsed,
      );
    }

    Uint8List compressed;

    switch (config.algorithm) {
      case CompressionAlgorithm.gzip:
        compressed = Uint8List.fromList(
          gzip.encode(data, level: config.level.level),
        );
        break;
      case CompressionAlgorithm.zlib:
        compressed = Uint8List.fromList(
          zlib.encode(data, level: config.level.level),
        );
        break;
      case CompressionAlgorithm.none:
        compressed = data;
        break;
    }

    stopwatch.stop();

    final result = CompressionResult(
      data: compressed,
      originalSize: data.length,
      compressedSize: compressed.length,
      algorithm: config.algorithm,
      duration: stopwatch.elapsed,
    );

    if (config.trackStats) {
      stats.recordCompression(result);
    }

    return result;
  }

  /// Decompress data
  Uint8List decompress(Uint8List data, CompressionAlgorithm algorithm) {
    final stopwatch = Stopwatch()..start();

    Uint8List decompressed;

    switch (algorithm) {
      case CompressionAlgorithm.gzip:
        decompressed = Uint8List.fromList(gzip.decode(data));
        break;
      case CompressionAlgorithm.zlib:
        decompressed = Uint8List.fromList(zlib.decode(data));
        break;
      case CompressionAlgorithm.none:
        decompressed = data;
        break;
    }

    stopwatch.stop();

    if (config.trackStats) {
      stats.recordDecompression(stopwatch.elapsed);
    }

    return decompressed;
  }

  /// Compress a string
  CompressionResult compressString(String text) {
    return compress(Uint8List.fromList(utf8.encode(text)));
  }

  /// Decompress to string
  String decompressString(Uint8List data, CompressionAlgorithm algorithm) {
    return utf8.decode(decompress(data, algorithm));
  }

  /// Compress JSON data
  CompressionResult compressJson(Map<String, dynamic> json) {
    return compressString(jsonEncode(json));
  }

  /// Decompress JSON data
  Map<String, dynamic> decompressJson(
    Uint8List data,
    CompressionAlgorithm algorithm,
  ) {
    return jsonDecode(decompressString(data, algorithm)) as Map<String, dynamic>;
  }
}

/// Wrapper for compressed blob storage
class CompressedBlob {
  final Uint8List data;
  final CompressionAlgorithm algorithm;
  final int originalSize;

  const CompressedBlob({
    required this.data,
    required this.algorithm,
    required this.originalSize,
  });

  /// Create from uncompressed data
  factory CompressedBlob.compress(
    Uint8List data,
    CompressionManager manager,
  ) {
    final result = manager.compress(data);
    return CompressedBlob(
      data: result.data,
      algorithm: result.algorithm,
      originalSize: result.originalSize,
    );
  }

  /// Decompress the data
  Uint8List decompress(CompressionManager manager) {
    return manager.decompress(data, algorithm);
  }

  /// Serialize for storage
  Uint8List toBytes() {
    // Format: [algorithm (1 byte)][originalSize (4 bytes)][data]
    final buffer = BytesBuilder();
    buffer.addByte(algorithm.index);
    buffer.add(_intToBytes(originalSize));
    buffer.add(data);
    return buffer.toBytes();
  }

  /// Deserialize from storage
  factory CompressedBlob.fromBytes(Uint8List bytes) {
    final algorithm = CompressionAlgorithm.values[bytes[0]];
    final originalSize = _bytesToInt(bytes.sublist(1, 5));
    final data = bytes.sublist(5);
    return CompressedBlob(
      data: data,
      algorithm: algorithm,
      originalSize: originalSize,
    );
  }

  static Uint8List _intToBytes(int value) {
    return Uint8List(4)
      ..[0] = (value >> 24) & 0xFF
      ..[1] = (value >> 16) & 0xFF
      ..[2] = (value >> 8) & 0xFF
      ..[3] = value & 0xFF;
  }

  static int _bytesToInt(Uint8List bytes) {
    return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  }
}

/// Mixin for compressed data support in entities
mixin CompressedDataMixin {
  CompressionManager get compressionManager;

  /// Compress a field value
  Uint8List compressField(String value) {
    return compressionManager.compressString(value).data;
  }

  /// Decompress a field value
  String decompressField(Uint8List data, CompressionAlgorithm algorithm) {
    return compressionManager.decompressString(data, algorithm);
  }
}

/// Drift type converter for compressed strings
class CompressedStringConverter extends TypeConverter<String, Uint8List> {
  static final _manager = CompressionManager();

  const CompressedStringConverter();

  @override
  String fromSql(Uint8List fromDb) {
    final blob = CompressedBlob.fromBytes(fromDb);
    return _manager.decompressString(blob.data, blob.algorithm);
  }

  @override
  Uint8List toSql(String value) {
    final result = _manager.compressString(value);
    return CompressedBlob(
      data: result.data,
      algorithm: result.algorithm,
      originalSize: result.originalSize,
    ).toBytes();
  }
}
`,
  output: {
    path: "lib/core/data",
    filename: "data_compression",
    extension: ".dart",
  },
  requires: ["drift"],
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const DRIFT_TEMPLATES: Template[] = [
  // Original templates
  DATABASE_TEMPLATE,
  TABLE_TEMPLATE,
  DAO_TEMPLATE,
  WEB_DATABASE_TEMPLATE,
  NATIVE_DATABASE_TEMPLATE,
  MIGRATION_TEMPLATE,
  KEY_MANAGER_TEMPLATE,
  SYNC_QUEUE_TEMPLATE,
  // Tier 1: Critical Offline Features
  CONFLICT_RESOLUTION_TEMPLATE,
  BACKGROUND_SYNC_TEMPLATE,
  OFFLINE_INDICATOR_TEMPLATE,
  OPTIMISTIC_UPDATE_TEMPLATE,
  RETRY_POLICY_TEMPLATE,
  // Tier 2: Performance & Scalability
  PAGINATION_TEMPLATE,
  LAZY_LOADING_TEMPLATE,
  QUERY_CACHE_TEMPLATE,
  BATCH_OPERATIONS_TEMPLATE,
  DATA_COMPRESSION_TEMPLATE,
];

export default DRIFT_TEMPLATES;
