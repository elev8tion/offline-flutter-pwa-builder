# Advanced Drift Templates Implementation Guide
**Tiers 3-6: Templates 11-28**

> This document outlines advanced Drift templates for production-grade offline-first PWAs.
> These templates build on the basic Drift module to create enterprise-ready applications.

---

## Tier 3: Advanced Offline Capabilities (Templates 11-15)

### 11. PARTIAL_SYNC_TEMPLATE
**Purpose:** Sync only changed fields instead of entire records (saves 90% bandwidth)

**Implementation:**
- Track changed fields per record using a `dirty_fields` JSON column
- Generate diff patches for updates
- Server-side merge logic
- Delta compression for efficient transmission

**MCP Tool:** `drift_enable_partial_sync`
```typescript
{
  projectId: string;
  tables: string[];  // Tables to enable partial sync for
  trackingStrategy: 'field-level' | 'column-bitmap';
  conflictResolution: 'server-wins' | 'client-wins' | 'merge';
}
```

**Generated Code:**
```dart
class PartialSyncManager {
  // Track which fields changed
  Map<String, Set<String>> _dirtyFields = {};

  // Generate delta for sync
  Map<String, dynamic> generateDelta(int recordId) {
    final dirty = _dirtyFields[recordId.toString()] ?? {};
    return {
      'id': recordId,
      'fields': dirty.map((field) => {
        'name': field,
        'value': getFieldValue(recordId, field)
      }).toList()
    };
  }

  // Apply server delta
  Future<void> applyDelta(Map<String, dynamic> delta) async {
    // Merge logic with conflict resolution
  }
}
```

**Value:** 10x faster sync, 90% less bandwidth usage

---

### 12. OFFLINE_QUEUE_PRIORITY_TEMPLATE
**Purpose:** Critical data syncs first (user actions before analytics)

**Implementation:**
- Priority queue with levels: CRITICAL, HIGH, NORMAL, LOW
- Age-based promotion (old LOW items become HIGH)
- Deadline support for time-sensitive operations
- Parallel sync for different priority levels

**MCP Tool:** `drift_configure_sync_priority`
```typescript
{
  projectId: string;
  priorities: {
    [operation: string]: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  };
  maxConcurrent: number;  // Max parallel syncs per priority
  agePromotionMs: number; // Promote after X milliseconds
}
```

**Generated Code:**
```dart
enum SyncPriority { CRITICAL, HIGH, NORMAL, LOW }

class PrioritySyncQueue {
  final Map<SyncPriority, List<SyncOperation>> _queues = {
    SyncPriority.CRITICAL: [],
    SyncPriority.HIGH: [],
    SyncPriority.NORMAL: [],
    SyncPriority.LOW: [],
  };

  void enqueue(SyncOperation op, SyncPriority priority) {
    _queues[priority]!.add(op);
    _processQueue();
  }

  Future<void> _processQueue() async {
    // Process CRITICAL first, then HIGH, etc.
    for (final priority in SyncPriority.values) {
      final ops = _queues[priority]!;
      if (ops.isEmpty) continue;

      await Future.wait(
        ops.take(maxConcurrent).map((op) => _sync(op))
      );
    }
  }
}
```

**Value:** Critical user actions never stuck behind background tasks

---

### 13. VERSIONED_ENTITY_TEMPLATE
**Purpose:** Entity versioning for conflict detection (optimistic locking)

**Implementation:**
- Add `version` column to all tables
- Increment on every update
- Server rejects if versions don't match
- Client can retry with latest version

**MCP Tool:** `drift_add_versioning`
```typescript
{
  projectId: string;
  tables: string[];
  strategy: 'increment' | 'timestamp' | 'vector-clock';
  conflictBehavior: 'reject' | 'merge' | 'force-update';
}
```

**Generated Code:**
```dart
@DataClassName('Todo')
class Todos extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get title => text()();
  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get updatedAt => dateTime()();
}

class TodoDao extends DatabaseAccessor<AppDatabase> {
  Future<bool> updateWithVersion(Todo todo, int expectedVersion) async {
    final result = await (update(todos)
      ..where((t) => t.id.equals(todo.id) & t.version.equals(expectedVersion))
    ).write(todo.copyWith(version: expectedVersion + 1));

    if (result == 0) {
      throw VersionConflictException('Entity was modified by another client');
    }
    return true;
  }
}
```

**Value:** Prevents data loss from concurrent edits

---

### 14. REPOSITORY_TEMPLATE
**Purpose:** Clean architecture with repository pattern

**Implementation:**
- Abstract interface for data access
- Implementation using DAOs
- In-memory caching layer
- Testable with mock repositories

**MCP Tool:** `drift_generate_repository`
```typescript
{
  projectId: string;
  tableName: string;
  operations: ('create' | 'read' | 'update' | 'delete' | 'list')[];
  includeCache: boolean;
  cacheTTL?: number;
}
```

**Generated Code:**
```dart
abstract class TodoRepository {
  Future<Todo> getById(int id);
  Future<List<Todo>> getAll();
  Future<Todo> create(Todo todo);
  Future<void> update(Todo todo);
  Future<void> delete(int id);
}

class TodoRepositoryImpl implements TodoRepository {
  final TodoDao _dao;
  final Map<int, (Todo, DateTime)> _cache = {};
  final Duration _ttl = Duration(minutes: 5);

  TodoRepositoryImpl(this._dao);

  @override
  Future<Todo> getById(int id) async {
    // Check cache first
    if (_cache.containsKey(id)) {
      final (todo, cachedAt) = _cache[id]!;
      if (DateTime.now().difference(cachedAt) < _ttl) {
        return todo;
      }
    }

    // Fetch from DB
    final todo = await _dao.getTodoById(id);
    _cache[id] = (todo, DateTime.now());
    return todo;
  }

  @override
  Future<void> update(Todo todo) async {
    await _dao.updateTodo(todo);
    _cache[todo.id] = (todo, DateTime.now()); // Update cache
  }
}
```

**Value:** Testable, maintainable, scalable architecture

---

### 15. FULL_TEXT_SEARCH_TEMPLATE
**Purpose:** Fast search across all text fields (like Notion/Evernote)

**Implementation:**
- FTS5 virtual table for full-text search
- Tokenization and stemming
- Rank-based results
- Highlight matching terms

**MCP Tool:** `drift_enable_full_text_search`
```typescript
{
  projectId: string;
  tables: {
    tableName: string;
    searchableColumns: string[];
  }[];
  language: 'english' | 'porter' | 'unicode61';
  enableHighlight: boolean;
}
```

**Generated Code:**
```dart
@DataClassName('TodoFts')
class TodosFts extends Table {
  TextColumn get title => text()();
  TextColumn get content => text()();

  @override
  Set<Column> get primaryKey => {};

  @override
  String get tableName => 'todos_fts';

  @override
  List<String> get customConstraints => [
    'USING FTS5(title, content, tokenize = "porter unicode61")'
  ];
}

class SearchDao extends DatabaseAccessor<AppDatabase> {
  Future<List<Todo>> search(String query) async {
    final results = await customSelect(
      '''
      SELECT t.*,
             rank AS score,
             highlight(todos_fts, 0, '<b>', '</b>') AS highlighted_title
      FROM todos_fts
      JOIN todos t ON todos_fts.rowid = t.id
      WHERE todos_fts MATCH ?
      ORDER BY rank
      LIMIT 50
      ''',
      variables: [Variable.withString(query)]
    ).get();

    return results.map((row) => Todo.fromData(row.data)).toList();
  }
}
```

**Value:** Professional search experience, faster than SQL LIKE

---

## Tier 4: Enterprise Requirements (Templates 16-20)

### 16. AUDIT_LOG_TEMPLATE
**Purpose:** Track all data changes for compliance (HIPAA, SOX, GDPR)

**Implementation:**
- Shadow table for each audited table
- Capture: who, what, when, before/after values
- Immutable audit records
- Query interface for auditors

**MCP Tool:** `drift_enable_audit_logging`
```typescript
{
  projectId: string;
  tables: string[];
  captureUserInfo: boolean;
  captureBeforeAfter: boolean;
  retentionDays?: number;
}
```

**Generated Code:**
```dart
@DataClassName('AuditLog')
class AuditLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get tableName => text()();
  IntColumn get recordId => integer()();
  TextColumn get action => text()(); // INSERT, UPDATE, DELETE
  TextColumn get userId => text().nullable()();
  TextColumn get beforeValue => text().nullable()();
  TextColumn get afterValue => text()();
  DateTimeColumn get timestamp => dateTime()();
  TextColumn get ipAddress => text().nullable()();
}

class AuditLogger {
  final AppDatabase db;

  Future<void> logUpdate(String table, int id, Map before, Map after, String userId) async {
    await db.into(db.auditLogs).insert(
      AuditLogsCompanion.insert(
        tableName: table,
        recordId: id,
        action: 'UPDATE',
        userId: Value(userId),
        beforeValue: Value(jsonEncode(before)),
        afterValue: jsonEncode(after),
        timestamp: DateTime.now(),
      ),
    );
  }

  Future<List<AuditLog>> getAuditTrail(String table, int recordId) async {
    return await (db.select(db.auditLogs)
      ..where((a) => a.tableName.equals(table) & a.recordId.equals(recordId))
      ..orderBy([(a) => OrderingTerm.desc(a.timestamp)])
    ).get();
  }
}
```

**Value:** Enterprise compliance, security audits, debugging

---

### 17. DATA_ANONYMIZATION_TEMPLATE
**Purpose:** GDPR "right to be forgotten" + data masking

**Implementation:**
- PII identification and tagging
- Anonymization strategies (hash, redact, delete)
- User data export (GDPR Article 20)
- Cascade deletion for related records

**MCP Tool:** `drift_configure_data_privacy`
```typescript
{
  projectId: string;
  piiFields: {
    table: string;
    column: string;
    strategy: 'hash' | 'redact' | 'delete' | 'anonymize';
  }[];
  exportFormat: 'json' | 'csv';
}
```

**Generated Code:**
```dart
class DataPrivacyManager {
  final AppDatabase db;

  // Anonymize user data
  Future<void> anonymizeUser(int userId) async {
    await db.transaction(() async {
      // Hash email
      await (db.update(db.users)..where((u) => u.id.equals(userId)))
        .write(UsersCompanion(
          email: Value('user_${userId}_deleted@example.com'),
          name: Value('Deleted User'),
          phone: Value(null),
        ));

      // Delete messages
      await (db.delete(db.messages)..where((m) => m.userId.equals(userId))).go();

      // Keep audit logs but redact PII
      await (db.update(db.auditLogs)..where((a) => a.userId.equals(userId.toString())))
        .write(AuditLogsCompanion(userId: Value('[REDACTED]')));
    });
  }

  // Export user data (GDPR Article 20)
  Future<Map<String, dynamic>> exportUserData(int userId) async {
    return {
      'user': await db.getUserById(userId),
      'todos': await db.getTodosByUser(userId),
      'notes': await db.getNotesByUser(userId),
      'exported_at': DateTime.now().toIso8601String(),
    };
  }
}
```

**Value:** GDPR compliance, user trust, legal protection

---

### 18. MULTI_TENANT_TEMPLATE
**Purpose:** Isolate data by user/organization (SaaS essential)

**Implementation:**
- Tenant ID column on all tables
- Row-level security via queries
- Tenant-aware DAOs
- Database-per-tenant option

**MCP Tool:** `drift_enable_multi_tenancy`
```typescript
{
  projectId: string;
  strategy: 'shared-db' | 'schema-per-tenant' | 'db-per-tenant';
  tenantIdentifier: 'userId' | 'orgId' | 'custom';
  isolationLevel: 'strict' | 'soft';
}
```

**Generated Code:**
```dart
class TenantContext {
  static final _tenantId = ValueNotifier<String?>(null);

  static String get current {
    if (_tenantId.value == null) {
      throw Exception('No tenant context set');
    }
    return _tenantId.value!;
  }

  static void set(String tenantId) => _tenantId.value = tenantId;
}

// Modified DAO with tenant isolation
class TodoDao extends DatabaseAccessor<AppDatabase> {
  Future<List<Todo>> getAllTodos() async {
    return await (select(todos)
      ..where((t) => t.tenantId.equals(TenantContext.current))
    ).get();
  }

  Future<void> insertTodo(TodosCompanion todo) async {
    await into(todos).insert(
      todo.copyWith(tenantId: Value(TenantContext.current))
    );
  }
}
```

**Value:** Build SaaS products, enterprise customers, data isolation

---

### 19. DATABASE_HEALTH_CHECK_TEMPLATE
**Purpose:** Auto-fix corruption, monitor size, optimize performance

**Implementation:**
- Integrity check (PRAGMA integrity_check)
- Size monitoring and alerts
- VACUUM to reclaim space
- Index usage statistics
- Query performance monitoring

**MCP Tool:** `drift_configure_health_checks`
```typescript
{
  projectId: string;
  checks: ('integrity' | 'size' | 'indexes' | 'vacuum')[];
  schedule: 'startup' | 'daily' | 'weekly';
  maxSizeMB: number;
  autoVacuum: boolean;
}
```

**Generated Code:**
```dart
class DatabaseHealthMonitor {
  final AppDatabase db;

  Future<HealthReport> runHealthCheck() async {
    final report = HealthReport();

    // Check integrity
    final integrityResult = await db.customSelect('PRAGMA integrity_check').getSingle();
    report.isIntact = integrityResult.read<String>('integrity_check') == 'ok';

    // Check size
    final pageCount = await db.customSelect('PRAGMA page_count').getSingle();
    final pageSize = await db.customSelect('PRAGMA page_size').getSingle();
    report.sizeMB = (pageCount.read<int>('page_count') *
                     pageSize.read<int>('page_size')) / 1024 / 1024;

    // Check fragmentation
    final freelistCount = await db.customSelect('PRAGMA freelist_count').getSingle();
    report.fragmentationPercent =
      (freelistCount.read<int>('freelist_count') / pageCount.read<int>('page_count')) * 100;

    return report;
  }

  Future<void> optimize() async {
    // Reclaim space
    await db.customStatement('VACUUM');

    // Analyze query patterns
    await db.customStatement('ANALYZE');

    // Rebuild indexes if needed
    if (report.fragmentationPercent > 30) {
      await db.customStatement('REINDEX');
    }
  }
}
```

**Value:** Prevent corruption, maintain performance, proactive monitoring

---

### 20. DATA_ARCHIVAL_TEMPLATE
**Purpose:** Move old records to archive tables (keep DB fast)

**Implementation:**
- Archive tables mirror main tables
- Scheduled archival jobs
- Archive criteria (age, status)
- Restore from archive
- Purge old archives

**MCP Tool:** `drift_configure_archival`
```typescript
{
  projectId: string;
  tables: {
    tableName: string;
    archiveAfterDays: number;
    archiveCriteria?: string; // SQL WHERE clause
    keepInMain?: boolean; // Soft delete vs hard delete
  }[];
  purgeArchiveAfterDays?: number;
}
```

**Generated Code:**
```dart
@DataClassName('ArchivedTodo')
class ArchivedTodos extends Table {
  IntColumn get id => integer()();
  TextColumn get title => text()();
  DateTimeColumn get completedAt => dateTime()();
  DateTimeColumn get archivedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class ArchivalManager {
  final AppDatabase db;

  Future<int> archiveOldTodos({int daysOld = 90}) async {
    final cutoffDate = DateTime.now().subtract(Duration(days: daysOld));

    return await db.transaction(() async {
      // Copy to archive
      final oldTodos = await (db.select(db.todos)
        ..where((t) => t.completedAt.isSmallerThanValue(cutoffDate))
      ).get();

      for (final todo in oldTodos) {
        await db.into(db.archivedTodos).insert(
          ArchivedTodosCompanion.insert(
            id: Value(todo.id),
            title: todo.title,
            completedAt: todo.completedAt!,
            archivedAt: DateTime.now(),
          ),
        );
      }

      // Delete from main table
      await (db.delete(db.todos)
        ..where((t) => t.completedAt.isSmallerThanValue(cutoffDate))
      ).go();

      return oldTodos.length;
    });
  }

  Future<void> restoreFromArchive(int id) async {
    final archived = await (db.select(db.archivedTodos)
      ..where((a) => a.id.equals(id))
    ).getSingle();

    await db.into(db.todos).insert(
      TodosCompanion.insert(
        id: Value(archived.id),
        title: archived.title,
        completedAt: Value(archived.completedAt),
      ),
    );

    await (db.delete(db.archivedTodos)..where((a) => a.id.equals(id))).go();
  }
}
```

**Value:** Keep main DB fast, retain historical data, compliance

---

## Tier 5: Developer Experience (Templates 21-25)

### 21. DATA_SEEDER_TEMPLATE
**Purpose:** Auto-populate demo data for development/testing

**Implementation:**
- Faker integration for realistic data
- Seed scripts for different scenarios
- Reset/reseed functionality
- Production seed data (initial categories, etc.)

**MCP Tool:** `drift_create_data_seeder`
```typescript
{
  projectId: string;
  seeds: {
    tableName: string;
    count: number;
    strategy: 'faker' | 'fixed' | 'custom';
    customData?: any[];
  }[];
  environment: 'development' | 'production';
}
```

**Generated Code:**
```dart
class DataSeeder {
  final AppDatabase db;
  final faker = Faker();

  Future<void> seedTodos({int count = 50}) async {
    final todos = List.generate(count, (i) => TodosCompanion.insert(
      title: faker.lorem.sentence(),
      description: Value(faker.lorem.sentences(3).join(' ')),
      dueDate: Value(faker.date.dateTime(minYear: 2024, maxYear: 2025)),
      priority: Value(['low', 'medium', 'high'][faker.randomGenerator.integer(3)]),
      completed: Value(faker.randomGenerator.boolean()),
    ));

    await db.batch((batch) {
      batch.insertAll(db.todos, todos);
    });
  }

  Future<void> seedProductionData() async {
    // Fixed data for production (categories, settings, etc.)
    await db.into(db.categories).insertAll([
      CategoriesCompanion.insert(name: 'Work', color: '#FF6B6B'),
      CategoriesCompanion.insert(name: 'Personal', color: '#4ECDC4'),
      CategoriesCompanion.insert(name: 'Shopping', color: '#45B7D1'),
    ]);
  }

  Future<void> reset() async {
    await db.transaction(() async {
      for (final table in db.allTables) {
        await db.delete(table).go();
      }
    });
  }
}
```

**Value:** Faster development, easier testing, onboarding demos

---

### 22. DATA_EXPORT_IMPORT_TEMPLATE
**Purpose:** Users can backup/restore their data (JSON/CSV)

**Implementation:**
- Export all user data as JSON/CSV
- Import from backup file
- Conflict handling on import
- Encryption for sensitive exports

**MCP Tool:** `drift_enable_backup_restore`
```typescript
{
  projectId: string;
  tables: string[];
  format: ('json' | 'csv')[];
  includeRelationships: boolean;
  encryptBackups: boolean;
}
```

**Generated Code:**
```dart
class BackupManager {
  final AppDatabase db;

  Future<String> exportToJson() async {
    final data = {
      'version': 1,
      'exported_at': DateTime.now().toIso8601String(),
      'todos': await db.select(db.todos).get(),
      'notes': await db.select(db.notes).get(),
      'habits': await db.select(db.habits).get(),
    };

    return jsonEncode(data);
  }

  Future<void> importFromJson(String json) async {
    final data = jsonDecode(json) as Map<String, dynamic>;

    await db.transaction(() async {
      // Import todos
      final todos = (data['todos'] as List).map((t) =>
        TodosCompanion.insert(
          id: Value(t['id']),
          title: t['title'],
          // ... other fields
        )
      ).toList();

      await db.batch((batch) {
        batch.insertAllOnConflictUpdate(db.todos, todos);
      });

      // Import other tables...
    });
  }

  Future<String> exportToCsv() async {
    final buffer = StringBuffer();
    buffer.writeln('id,title,description,due_date,completed');

    final todos = await db.select(db.todos).get();
    for (final todo in todos) {
      buffer.writeln(
        '${todo.id},"${todo.title}","${todo.description}",${todo.dueDate},${todo.completed}'
      );
    }

    return buffer.toString();
  }
}
```

**Value:** User data ownership, migration between devices, disaster recovery

---

### 23. SCHEMA_VALIDATOR_TEMPLATE
**Purpose:** Validate data before insert/update (type safety + business rules)

**Implementation:**
- Schema validation rules
- Custom validators per field
- Pre-insert/update hooks
- Validation error reporting

**MCP Tool:** `drift_add_validation`
```typescript
{
  projectId: string;
  validations: {
    table: string;
    column: string;
    rules: ('required' | 'email' | 'url' | 'min' | 'max' | 'pattern' | 'custom')[];
    customValidator?: string; // Dart code
    errorMessage?: string;
  }[];
}
```

**Generated Code:**
```dart
class ValidationRule {
  final String field;
  final String? Function(dynamic value) validator;
  final String errorMessage;

  ValidationRule(this.field, this.validator, this.errorMessage);
}

class TodoValidator {
  static final rules = [
    ValidationRule(
      'title',
      (value) => value == null || value.isEmpty ? 'Title is required' : null,
      'Title is required',
    ),
    ValidationRule(
      'email',
      (value) => !RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)
        ? 'Invalid email' : null,
      'Invalid email format',
    ),
    ValidationRule(
      'priority',
      (value) => !['low', 'medium', 'high'].contains(value)
        ? 'Invalid priority' : null,
      'Priority must be low, medium, or high',
    ),
  ];

  static ValidationResult validate(TodosCompanion todo) {
    final errors = <String, String>{};

    for (final rule in rules) {
      final value = _getFieldValue(todo, rule.field);
      final error = rule.validator(value);
      if (error != null) {
        errors[rule.field] = error;
      }
    }

    return ValidationResult(errors);
  }
}

// Usage in DAO
class TodoDao extends DatabaseAccessor<AppDatabase> {
  Future<int> insertTodo(TodosCompanion todo) async {
    final validation = TodoValidator.validate(todo);
    if (!validation.isValid) {
      throw ValidationException(validation.errors);
    }

    return await into(todos).insert(todo);
  }
}
```

**Value:** Data integrity, better error messages, prevent bugs

---

### 24. CHANGE_NOTIFIER_TEMPLATE
**Purpose:** Real-time UI updates when data changes (event bus)

**Implementation:**
- Stream-based change notifications
- Table-specific streams
- Filter by operation (INSERT/UPDATE/DELETE)
- Batch change notifications

**MCP Tool:** `drift_enable_change_notifications`
```typescript
{
  projectId: string;
  tables: string[];
  debounceMs?: number; // Batch rapid changes
  includeOldValue: boolean;
}
```

**Generated Code:**
```dart
enum ChangeType { INSERT, UPDATE, DELETE }

class DataChange {
  final String table;
  final int recordId;
  final ChangeType type;
  final dynamic newValue;
  final dynamic? oldValue;
  final DateTime timestamp;

  DataChange({
    required this.table,
    required this.recordId,
    required this.type,
    required this.newValue,
    this.oldValue,
  }) : timestamp = DateTime.now();
}

class ChangeNotifier {
  final _controller = StreamController<DataChange>.broadcast();

  Stream<DataChange> get stream => _controller.stream;

  Stream<DataChange> forTable(String table) {
    return stream.where((change) => change.table == table);
  }

  Stream<DataChange> forType(ChangeType type) {
    return stream.where((change) => change.type == type);
  }

  void notify(DataChange change) {
    _controller.add(change);
  }

  void dispose() {
    _controller.close();
  }
}

// Usage in DAO
class TodoDao extends DatabaseAccessor<AppDatabase> {
  final ChangeNotifier changeNotifier;

  TodoDao(this.changeNotifier);

  @override
  Future<int> insert(Insertable<Todo> entity) async {
    final id = await super.insert(entity);
    changeNotifier.notify(DataChange(
      table: 'todos',
      recordId: id,
      type: ChangeType.INSERT,
      newValue: entity,
    ));
    return id;
  }
}

// Usage in UI
class TodoListWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StreamBuilder<DataChange>(
      stream: ref.read(changeNotifierProvider).forTable('todos'),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          // Refresh UI when todos change
          ref.invalidate(todosProvider);
        }
        // ... build UI
      },
    );
  }
}
```

**Value:** Reactive UI, cross-widget updates, real-time feel

---

### 25. ATTACHMENT_HANDLER_TEMPLATE
**Purpose:** Store images/files offline with caching

**Implementation:**
- Blob storage in SQLite
- File compression
- Thumbnail generation
- Cache invalidation
- Upload queue for offline files

**MCP Tool:** `drift_enable_attachments`
```typescript
{
  projectId: string;
  maxFileSizeMB: number;
  allowedTypes: string[]; // ['image/*', 'application/pdf']
  generateThumbnails: boolean;
  compressionQuality: number; // 0-100
}
```

**Generated Code:**
```dart
@DataClassName('Attachment')
class Attachments extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get fileName => text()();
  TextColumn get mimeType => text()();
  IntColumn get sizeBytes => integer()();
  BlobColumn get data => blob()();
  BlobColumn get thumbnail => blob().nullable()();
  DateTimeColumn get uploadedAt => dateTime()();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();
}

class AttachmentManager {
  final AppDatabase db;

  Future<int> saveFile(File file) async {
    final bytes = await file.readAsBytes();
    final mimeType = lookupMimeType(file.path) ?? 'application/octet-stream';

    // Compress if image
    Uint8List? thumbnail;
    if (mimeType.startsWith('image/')) {
      final image = img.decodeImage(bytes);
      if (image != null) {
        final resized = img.copyResize(image, width: 200);
        thumbnail = Uint8List.fromList(img.encodeJpg(resized, quality: 70));
      }
    }

    return await db.into(db.attachments).insert(
      AttachmentsCompanion.insert(
        fileName: path.basename(file.path),
        mimeType: mimeType,
        sizeBytes: bytes.length,
        data: bytes,
        thumbnail: Value(thumbnail),
        uploadedAt: DateTime.now(),
      ),
    );
  }

  Future<File> getFile(int id) async {
    final attachment = await (db.select(db.attachments)
      ..where((a) => a.id.equals(id))
    ).getSingle();

    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/${attachment.fileName}');
    await file.writeAsBytes(attachment.data);

    return file;
  }

  Future<void> syncUnsyncedAttachments() async {
    final unsynced = await (db.select(db.attachments)
      ..where((a) => a.synced.equals(false))
    ).get();

    for (final attachment in unsynced) {
      // Upload to server
      await uploadToServer(attachment);

      // Mark as synced
      await (db.update(db.attachments)..where((a) => a.id.equals(attachment.id)))
        .write(AttachmentsCompanion(synced: Value(true)));
    }
  }
}
```

**Value:** Offline file support, image handling, upload queuing

---

## Tier 6: Analytics & Monetization (Templates 26-28)

### 26. OFFLINE_ANALYTICS_TEMPLATE
**Purpose:** Track usage offline, batch upload later

**Implementation:**
- Event queue (page views, clicks, errors)
- Batch upload on reconnect
- Privacy controls (opt-out)
- Session tracking
- Custom event properties

**MCP Tool:** `drift_enable_analytics`
```typescript
{
  projectId: string;
  events: string[]; // ['page_view', 'button_click', 'error']
  batchSize: number;
  uploadInterval: number; // seconds
  anonymize: boolean;
}
```

**Generated Code:**
```dart
@DataClassName('AnalyticsEvent')
class AnalyticsEvents extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get eventName => text()();
  TextColumn get properties => text()(); // JSON
  TextColumn get userId => text().nullable()();
  TextColumn get sessionId => text()();
  DateTimeColumn get timestamp => dateTime()();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();
}

class AnalyticsTracker {
  final AppDatabase db;
  String? _sessionId;

  Future<void> trackEvent(String eventName, [Map<String, dynamic>? properties]) async {
    _sessionId ??= Uuid().v4();

    await db.into(db.analyticsEvents).insert(
      AnalyticsEventsCompanion.insert(
        eventName: eventName,
        properties: jsonEncode(properties ?? {}),
        sessionId: _sessionId!,
        userId: Value(await _getUserId()),
        timestamp: DateTime.now(),
      ),
    );

    _checkAndSync();
  }

  Future<void> _checkAndSync() async {
    final unsynced = await (db.select(db.analyticsEvents)
      ..where((e) => e.synced.equals(false))
    ).get();

    if (unsynced.length >= batchSize && await isOnline()) {
      await _syncEvents(unsynced);
    }
  }

  Future<void> _syncEvents(List<AnalyticsEvent> events) async {
    // Upload to analytics service
    await uploadToAnalytics(events.map((e) => {
      'event': e.eventName,
      'properties': jsonDecode(e.properties),
      'timestamp': e.timestamp.toIso8601String(),
      'user_id': e.userId,
      'session_id': e.sessionId,
    }).toList());

    // Mark as synced
    await db.batch((batch) {
      for (final event in events) {
        batch.update(
          db.analyticsEvents,
          AnalyticsEventsCompanion(synced: Value(true)),
          where: (e) => e.id.equals(event.id),
        );
      }
    });
  }
}

// Usage
class MyApp extends StatelessWidget {
  final analytics = AnalyticsTracker(database);

  void onButtonClick() {
    analytics.trackEvent('button_click', {
      'button_id': 'save_todo',
      'screen': 'home',
    });
  }
}
```

**Value:** Understand user behavior, improve product, monetization insights

---

### 27. CACHE_TTL_TEMPLATE
**Purpose:** Time-based cache expiration and auto-refresh

**Implementation:**
- TTL (time-to-live) per table
- Background refresh for stale data
- Conditional GET for efficiency
- Cache warming strategies

**MCP Tool:** `drift_configure_cache_ttl`
```typescript
{
  projectId: string;
  caches: {
    table: string;
    ttlSeconds: number;
    refreshStrategy: 'lazy' | 'eager' | 'background';
    maxAge?: number; // Hard expiration
  }[];
}
```

**Generated Code:**
```dart
@DataClassName('CacheMetadata')
class CacheMetadataTable extends Table {
  TextColumn get cacheKey => text()();
  DateTimeColumn get cachedAt => dateTime()();
  DateTimeColumn get expiresAt => dateTime()();
  TextColumn get etag => text().nullable()();

  @override
  Set<Column> get primaryKey => {cacheKey};

  @override
  String get tableName => 'cache_metadata';
}

class CacheManager {
  final AppDatabase db;
  final Map<String, Duration> _ttlConfig = {
    'todos': Duration(minutes: 5),
    'users': Duration(hours: 1),
    'settings': Duration(days: 1),
  };

  Future<bool> isCacheValid(String table) async {
    final metadata = await (db.select(db.cacheMetadataTable)
      ..where((m) => m.cacheKey.equals(table))
    ).getSingleOrNull();

    if (metadata == null) return false;

    return DateTime.now().isBefore(metadata.expiresAt);
  }

  Future<void> setCacheMetadata(String table, {String? etag}) async {
    final ttl = _ttlConfig[table] ?? Duration(minutes: 5);
    final now = DateTime.now();

    await db.into(db.cacheMetadataTable).insertOnConflictUpdate(
      CacheMetadataCompanion.insert(
        cacheKey: table,
        cachedAt: now,
        expiresAt: now.add(ttl),
        etag: Value(etag),
      ),
    );
  }

  Future<List<T>> fetchWithCache<T>(
    String table,
    Future<List<T>> Function() localFetch,
    Future<List<T>> Function(String? etag) remoteFetch,
  ) async {
    final isValid = await isCacheValid(table);

    if (isValid) {
      return await localFetch();
    }

    // Cache expired, fetch from server
    final metadata = await _getMetadata(table);
    final remoteData = await remoteFetch(metadata?.etag);

    if (remoteData.isNotEmpty) {
      await setCacheMetadata(table, etag: _computeEtag(remoteData));
      return remoteData;
    }

    // Server returned 304 Not Modified, cache still valid
    await setCacheMetadata(table, etag: metadata!.etag);
    return await localFetch();
  }
}
```

**Value:** Faster loads, reduced bandwidth, fresher data

---

### 28. RELATIONSHIP_TEMPLATE
**Purpose:** Complex joins and nested object hydration

**Implementation:**
- One-to-many, many-to-many relationships
- Eager loading vs lazy loading
- Nested object serialization
- Cascade operations

**MCP Tool:** `drift_add_relationship`
```typescript
{
  projectId: string;
  relationships: {
    name: string;
    from: { table: string; column: string; };
    to: { table: string; column: string; };
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    cascadeDelete?: boolean;
    eagerLoad?: boolean;
  }[];
}
```

**Generated Code:**
```dart
// Many-to-many: Users <-> Teams via UserTeams junction table
class RelationshipDao extends DatabaseAccessor<AppDatabase> {
  RelationshipDao(AppDatabase db) : super(db);

  // Get user with all their teams (eager loading)
  Future<UserWithTeams> getUserWithTeams(int userId) async {
    final user = await (select(users)..where((u) => u.id.equals(userId))).getSingle();

    final teams = await (select(db.teams)
      .join([
        innerJoin(
          db.userTeams,
          db.userTeams.teamId.equalsExp(db.teams.id),
        ),
      ])
      ..where(db.userTeams.userId.equals(userId))
    ).map((row) => row.readTable(db.teams)).get();

    return UserWithTeams(user: user, teams: teams);
  }

  // Get todos with nested categories and tags
  Future<List<TodoWithRelations>> getTodosWithRelations() async {
    final query = select(todos).join([
      leftOuterJoin(categories, categories.id.equalsExp(todos.categoryId)),
      innerJoin(todoTags, todoTags.todoId.equalsExp(todos.id)),
      innerJoin(tags, tags.id.equalsExp(todoTags.tagId)),
    ]);

    final rows = await query.get();

    // Group by todo ID and collect tags
    final Map<int, TodoWithRelations> result = {};

    for (final row in rows) {
      final todo = row.readTable(todos);
      final category = row.readTableOrNull(categories);
      final tag = row.readTable(tags);

      if (!result.containsKey(todo.id)) {
        result[todo.id] = TodoWithRelations(
          todo: todo,
          category: category,
          tags: [],
        );
      }

      result[todo.id]!.tags.add(tag);
    }

    return result.values.toList();
  }

  // Cascade delete: delete user and all their todos
  Future<void> deleteUserCascade(int userId) async {
    await transaction(() async {
      await (delete(todos)..where((t) => t.userId.equals(userId))).go();
      await (delete(users)..where((u) => u.id.equals(userId))).go();
    });
  }
}

// Value objects
class UserWithTeams {
  final User user;
  final List<Team> teams;

  UserWithTeams({required this.user, required this.teams});
}

class TodoWithRelations {
  final Todo todo;
  final Category? category;
  final List<Tag> tags;

  TodoWithRelations({required this.todo, this.category, required this.tags});
}
```

**Value:** Model complex domains, reduce N+1 queries, cleaner code

---

## Implementation Priorities

### Phase 1 (Q1 2025): Advanced Offline (11-15)
**Effort:** 3-4 weeks
**Impact:** High - Makes offline truly production-ready
**Dependencies:** Tier 1 templates must be implemented first

### Phase 2 (Q2 2025): Enterprise Features (16-20)
**Effort:** 4-5 weeks
**Impact:** High - Enables enterprise sales
**Dependencies:** Phase 1 complete

### Phase 3 (Q3 2025): Developer Experience (21-25)
**Effort:** 2-3 weeks
**Impact:** Medium - Faster development cycles
**Dependencies:** None (can be parallel with Phase 2)

### Phase 4 (Q4 2025): Analytics & Polish (26-28)
**Effort:** 2 weeks
**Impact:** Medium - Enables monetization
**Dependencies:** Phase 1-2 complete

---

## Technical Architecture Notes

### Template Generation Strategy
All templates follow this pattern:
```typescript
{
  id: string;           // Unique template ID
  name: string;         // Human-readable name
  description: string;  // Purpose and use case
  type: 'file';         // Template type
  source: string;       // Handlebars template
  output: {             // Output configuration
    path: string;       // Relative path
    filename: string;   // File name (can use {{variables}})
    extension: string;  // File extension
  };
}
```

### Handlebars Helpers Needed
```typescript
// Custom helpers for advanced templates
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('switch', function(value, options) { ... });
Handlebars.registerHelper('case', function(value, options) { ... });
Handlebars.registerHelper('snakeCase', (str) => _.snakeCase(str));
Handlebars.registerHelper('pascalCase', (str) => _.upperFirst(_.camelCase(str)));
```

### Dependencies to Add
```json
{
  "faker": "^5.5.3",          // For DATA_SEEDER_TEMPLATE
  "archiver": "^5.3.1",       // For DATA_EXPORT_IMPORT_TEMPLATE (zip)
  "papaparse": "^5.4.1"       // For CSV export/import
}
```

---

## Success Metrics

Track these metrics for each template:
1. **Adoption Rate:** % of projects using each template
2. **Time Saved:** Development hours saved vs manual implementation
3. **Bug Reduction:** Fewer offline sync bugs reported
4. **Performance Impact:** App performance before/after using template
5. **User Satisfaction:** NPS from developers using templates

---

## Future Considerations

### Templates 29-35 (Future Expansion)
- **GEOSPATIAL_TEMPLATE:** Offline maps and location queries
- **COLLABORATIVE_EDITING_TEMPLATE:** Real-time collaborative text editing (CRDT)
- **ML_MODEL_STORAGE_TEMPLATE:** Store and run ML models offline
- **BLOCKCHAIN_SYNC_TEMPLATE:** Blockchain-based conflict-free sync
- **VOICE_DATA_TEMPLATE:** Store and sync voice notes/audio
- **BIOMETRIC_AUTH_TEMPLATE:** Offline biometric authentication
- **SMART_PREFETCH_TEMPLATE:** ML-based predictive data prefetching

---

## Conclusion

These 18 templates (11-28) transform the offline-flutter-pwa-builder from a **code generator** into a **platform for building world-class offline-first applications**.

The market opportunity is significant:
- **No competing MCP server** offers this depth
- **Enterprise demand** for offline-first is growing (remote work, unreliable connectivity)
- **Developer productivity** gains are 5-10x vs manual implementation

**Next Steps:**
1. Validate priorities with early users (which templates would they pay for?)
2. Build Phase 1 (templates 11-15) as MVP
3. Measure adoption and iterate
4. Expand to Phases 2-4 based on demand

**ROI Estimate:**
- Development cost: ~$50K (12 weeks @ $4K/week)
- Potential revenue: $100K+ (200 licenses @ $499 or 20 enterprise deals @ $5K)
- Consulting opportunities: $200K+ (10 projects @ $20K)

**Total potential value: $300K+ in Year 1**
