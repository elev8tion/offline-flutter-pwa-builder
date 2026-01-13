# UNIFIED IMPLEMENTATION BLUEPRINT
## Offline Flutter PWA Builder MCP Server

**Purpose:** This document unifies three sources into a single implementation blueprint for building a production-ready MCP server that generates offline-first Flutter PWAs.

---

## SOURCE INVENTORY

| Source | Type | Tools | Lines | Status |
|--------|------|-------|-------|--------|
| `mcp_server_structure` | Specification | 24 | 2,781 | Blueprint |
| `flutterorchestrator MCP` | Implementation | 41 | ~15,000 | Working |
| `visual-flutter-generator` | Implementation | 26 | ~15,000 | Working |

**Total Reusable Assets:** 91 tools, ~30,000 lines of tested code

---

## PART 1: CORE ARCHITECTURE (From mcp_server_structure)

### 1.1 Project Engine
**Purpose:** Define, create, and manage project structures

```typescript
interface ProjectDefinition {
  id: string;
  name: string;
  displayName: string;
  version: string;
  pwa: PWAConfig;
  offline: OfflineConfig;
  architecture: 'clean' | 'feature-first' | 'layer-first';
  stateManagement: 'riverpod' | 'bloc' | 'provider';
  modules: ModuleConfig[];
  targets: ('web' | 'android' | 'ios' | 'windows' | 'macos' | 'linux')[];
}

interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui';
  orientation: 'portrait' | 'landscape' | 'any';
  icons: IconConfig[];
  startUrl: string;
  scope: string;
}

interface OfflineConfig {
  strategy: 'offline-first' | 'online-first' | 'cache-first';
  storage: {
    type: 'drift';
    encryption: boolean;
    maxSize?: number;
  };
  caching: {
    assets: boolean;
    api: boolean;
    ttl: number;
  };
  sync?: SyncConfig;
}
```

**Implementation:** `src/core/project-engine/`

### 1.2 Template Engine
**Purpose:** Render code templates with project context

```typescript
interface Template {
  id: string;
  name: string;
  type: 'file' | 'directory' | 'snippet';
  source: string;
  output: { path: string; filename: string; extension: string; };
  conditions?: TemplateCondition[];
  transforms?: Transform[];
  requires?: string[];
}

interface TemplateEngine {
  register(template: Template): void;
  render(templateId: string, context: TemplateContext): Promise<RenderedFile>;
  renderMultiple(templateIds: string[], context: TemplateContext): Promise<RenderedFile[]>;
  preview(templateId: string, context: TemplateContext): string;
}
```

**Implementation:** `src/core/template-engine/`

### 1.3 Module System
**Purpose:** Pluggable modules that extend functionality

```typescript
interface Module {
  id: string;
  name: string;
  version: string;
  compatibleTargets: ('web' | 'android' | 'ios' | 'desktop')[];
  dependencies: ModuleDependency[];
  conflicts: string[];
  configSchema: JSONSchema;
  defaultConfig: Record<string, unknown>;
  templates: Template[];
  assets: Asset[];
  hooks: ModuleHooks;
}

interface ModuleHooks {
  onInstall?: (ctx: HookContext) => Promise<void>;
  beforeGenerate?: (ctx: HookContext) => Promise<void>;
  onGenerate?: (ctx: HookContext) => Promise<GeneratedFile[]>;
  afterGenerate?: (ctx: HookContext) => Promise<void>;
  beforeBuild?: (ctx: HookContext) => Promise<void>;
  afterBuild?: (ctx: HookContext) => Promise<void>;
  onUninstall?: (ctx: HookContext) => Promise<void>;
}
```

**Implementation:** `src/core/module-system/`

### 1.4 Validation Framework
**Purpose:** Extensible validation for code, config, and security

```typescript
interface Validator {
  id: string;
  name: string;
  target: 'project' | 'module' | 'file' | 'code' | 'config';
  patterns?: string[];
  severity: 'error' | 'warning' | 'info';
  validate: (input: ValidationInput) => Promise<ValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  validator: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
  autofix?: AutoFix;
}
```

**Implementation:** `src/core/validation-framework/`

### 1.5 Security Framework
**Purpose:** Enforce security policies across all generated code

```typescript
interface SecurityPolicy {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  target: 'code' | 'config' | 'dependency' | 'runtime';
  check: (input: SecurityInput) => Promise<SecurityFinding[]>;
  remediate?: (finding: SecurityFinding) => Promise<void>;
}
```

**Built-in Policies:**
- `no-hardcoded-secrets` - API keys, passwords in code
- `secure-storage` - Encryption for sensitive data
- `input-validation` - SQL injection, XSS prevention
- `dependency-audit` - Known vulnerabilities in deps
- `secure-headers` - CSP, CORS configuration
- `offline-data-security` - OPFS encryption, key management

**Implementation:** `src/core/security-framework/`

### 1.6 File System Abstraction
**Purpose:** Unified file operations for local and in-memory

```typescript
interface FileSystem {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  list(path: string, pattern?: string): Promise<string[]>;
  beginTransaction(): Transaction;
}
```

**Implementation:** `src/core/filesystem/`

---

## PART 2: REUSABLE CODE FROM FLUTTERORCHESTRATOR MCP

### 2.1 MCP Server Setup Pattern

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "offline-flutter-pwa-builder", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // Route to handlers
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2.2 Widget Tracking System (REUSABLE)

```typescript
interface TrackedWidget {
  id: string;
  type: string;
  screenId?: string;
  parentId?: string;
  properties: Record<string, any>;
  children: string[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    position?: number;
    generatedBy: 'flutter-orchestrator' | 'web-ui';
  };
  tracking: {
    interactionCount: number;
    modificationHistory: Array<{
      timestamp: string;
      changes: Record<string, any>;
    }>;
  };
}

class WidgetTrackingIntegration {
  private widgetRegistry: Map<string, TrackedWidget> = new Map();
  public screenRegistry: Map<string, any> = new Map();

  enhanceWidgetCode(widgetCode: string, widgetName: string, widgetType: string, properties?: any[]): { code: string; widgetId: string; metadata: TrackedWidget }
  generateWidgetTree(screenId: string): any
  createTrackedScreen(screenName: string, routeName: string): { screenId: string; metadata: any }
  addWidgetToScreen(screenId: string, widgetType: string, properties?: any, parentId?: string)
}
```

**Use For:** Component registry, widget tree management

### 2.3 Communication Protocol (REUSABLE)

```typescript
type MessageType =
  | 'connection_established'
  | 'widget_selected'
  | 'widget_property_changed'
  | 'widget_tree_request'
  | 'widget_tree_response'
  | 'code_generation_request'
  | 'code_generation_response'
  | 'real_time_update'
  | 'sync_request'
  | 'sync_response'
  | 'hot_reload_complete';

interface Message {
  id: string;
  type: MessageType;
  source: ClientType;
  target?: ClientType;
  timestamp: string;
  payload: any;
  requiresResponse?: boolean;
}

class CommunicationProtocol extends EventEmitter {
  private clients: Map<string, ClientConnection> = new Map();
  private messageHandlers: Map<MessageType, Function[]> = new Map();

  async initialize(options: { websocketPort?: number; httpPort?: number }): Promise<void>
  async sendMessage(message: Message, clientId?: string): Promise<void>
  broadcast(message: Message, excludeClientId?: string): void
}
```

**Use For:** Real-time preview, hot reload, sync between clients

### 2.4 Handler Structure (REUSABLE)

```
src/handlers/
├── codeGeneration.ts       # Widget, BLoC, API client generation
├── deployment.ts           # CI/CD pipeline generation
├── visualDesign.ts         # Theme and animation generation
├── stateManagement.ts      # Provider/Riverpod/Bloc setup
├── performance.ts          # Performance analysis
├── accessibility.ts        # A11y audit and i18n
├── apiData.ts              # Mock server & JSON models
├── projectAnalysis.ts      # Project structure analysis
├── uiComponents.ts         # Reusable UI components
└── testing.ts              # Test generation
```

### 2.5 Code Generation Patterns (REUSABLE)

**Widget Generation:**
```typescript
const widgetCode = `import 'package:flutter/material.dart';

class ${className} extends StatelessWidget {
  ${props?.map(prop => `final ${prop.type} ${prop.name};`).join('\n  ')}

  const ${className}({
    Key? key,
    ${props?.map(prop => `${prop.required ? 'required ' : ''}this.${prop.name},`).join('\n    ')}
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${className} Widget', style: Theme.of(context).textTheme.headlineMedium),
        ],
      ),
    );
  }
}`;
```

**BLoC Generation:**
```typescript
// Events as abstract class with sub-classes
// States with Equatable
// BLoC with on<Event> handlers
```

**API Client Generation:**
```typescript
// Dio-based client with interceptors
// One method per endpoint
// Error handling
```

### 2.6 Theme Generation (REUSABLE)

```dart
class AppTheme {
  static final Color primaryColor = Color(0xFF${primaryColor});

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
    ),
    textTheme: GoogleFonts.${fontFamily}TextTheme(),
    appBarTheme: AppBarTheme(...),
    elevatedButtonTheme: ElevatedButtonThemeData(...),
    cardTheme: CardTheme(elevation: ${borderRadius}),
  );

  static ThemeData darkTheme = ThemeData(...);
}
```

### 2.7 Navigation Generation (REUSABLE)

```dart
class NavigationHelper {
  static void navigateTo(BuildContext context, String routeName)
  static void navigateAndReplace(BuildContext context, String routeName)
  static void navigateAndClearStack(BuildContext context, String routeName)
  static void goBack(BuildContext context)
}

class AppDrawer extends StatelessWidget { ... }
class BottomNavigation extends StatelessWidget { ... }
```

### 2.8 SQLite Persistence (REUSABLE)

```typescript
class UnifiedWidgetTracker {
  private db: Database | null = null;

  // Tables: projects, widgets, edit_history
  // Auto-save, recovery, versioning
}
```

### 2.9 NPM Dependencies (REUSABLE)

```json
{
  "@modelcontextprotocol/sdk": "^0.5.0",
  "zod": "^3.22.4",
  "uuid": "^9.0.1",
  "ws": "^8.18.3",
  "sqlite": "^5.1.1",
  "sqlite3": "^5.1.7",
  "fs-extra": "^11.2.0",
  "glob": "^10.3.10",
  "js-yaml": "^4.1.0",
  "lodash": "^4.17.21"
}
```

---

## PART 3: REUSABLE CODE FROM VISUAL-FLUTTER-GENERATOR

### 3.1 Visual Analysis Engine (DIRECT REUSE)

```typescript
class VisualAnalyzer {
  async analyzeScreenshot(imagePath: string, options?: AnalysisOptions): Promise<AnalysisResult> {
    // Edge detection (Sobel algorithm)
    // Color extraction (k-means clustering)
    // Component detection
    // Layout analysis
  }
}

interface AnalysisResult {
  elements: UIElement[];
  colors: ColorPalette;
  layoutType: 'column' | 'row' | 'grid' | 'stack';
  patterns: UIPattern[];
  navigation: NavigationStructure;
}
```

### 3.2 Code Generation Engine (ADAPT)

```typescript
class CodeGenerator {
  generateWidget(element: UIElement): string
  generateScreen(analysis: AnalysisResult, screenName: string): string
  generateCompleteApp(screenshots: Screenshot[], options: AppOptions): GeneratedApp
}

interface GeneratedApp {
  name: string;
  files: Map<string, string>;
  pubspec: PubspecConfig;
  assets: Asset[];
  navigation: NavigationConfig;
}
```

### 3.3 State Management Generation (DIRECT REUSE)

**Provider:**
```dart
class ${featureName}Provider extends ChangeNotifier {
  List<${modelName}> _items = [];
  bool _isLoading = false;
  String? _error;

  Future<void> load() async { ... }
  Future<void> add(${modelName} item) async { ... }
  Future<void> update(${modelName} item) async { ... }
  Future<void> delete(String id) async { ... }
}
```

**Riverpod:**
```dart
final ${featureName}Provider = StateNotifierProvider<${featureName}Notifier, ${featureName}State>((ref) {
  return ${featureName}Notifier();
});
```

**BLoC:**
```dart
class ${featureName}Bloc extends Bloc<${featureName}Event, ${featureName}State> {
  ${featureName}Bloc() : super(${featureName}Initial()) {
    on<Load${featureName}>(_onLoad);
    on<Add${modelName}>(_onAdd);
    on<Update${modelName}>(_onUpdate);
    on<Delete${modelName}>(_onDelete);
  }
}
```

### 3.4 Navigation Generation (DIRECT REUSE)

**GoRouter:**
```dart
final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (context, state) => HomeScreen()),
    GoRoute(path: '/details/:id', builder: (context, state) => DetailsScreen(id: state.pathParameters['id']!)),
  ],
);
```

**Navigator 2.0:**
```dart
class AppRouterDelegate extends RouterDelegate<AppRoutePath> { ... }
class AppRouteParser extends RouteInformationParser<AppRoutePath> { ... }
```

### 3.5 Validation System (DIRECT REUSE)

```typescript
class CodeValidator {
  validateDart(code: string): ValidationResult
  validateImports(code: string): ValidationResult
  checkCodeQuality(code: string): QualityReport
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: Suggestion[];
}
```

### 3.6 Learning System (DIRECT REUSE)

```typescript
class LearningSystem {
  private db: Database;

  // SQLite Tables:
  // - generations (id, strategy, patterns_used, quality_score, timestamp)
  // - feedback (generation_id, type, rating, comment, corrections)
  // - patterns (id, name, type, template, success_rate)
  // - analytics (metric, value, timestamp)

  recordGeneration(generation: Generation): Promise<void>
  recordFeedback(feedback: Feedback): Promise<void>
  getTopPatterns(limit: number): Promise<Pattern[]>
  getLearningInsights(timeframe: number): Promise<Insights>
}
```

### 3.7 Export Pipeline (ADAPT)

```typescript
class ExportPipeline {
  async exportProject(app: GeneratedApp, options: ExportOptions): Promise<void> {
    // Validate code
    // Create directory structure
    // Write files
    // Initialize git
    // Run tests (optional)
  }
}

interface ExportOptions {
  outputPath: string;
  format: 'standalone' | 'flutterflow' | 'both';
  validateCode: boolean;
  initGit: boolean;
  runTests: boolean;
}
```

---

## PART 4: MODULE SPECIFICATIONS (From mcp_server_structure)

### 4.1 Drift Module (Phase 2)

**Config Schema:**
```typescript
{
  databaseName: string;
  encryption: boolean;
  encryptionKeyStrategy: 'derived' | 'stored' | 'user-provided';
  tables: TableDefinition[];
  enableMigrations: boolean;
  webWorker: boolean;
  opfs: boolean;
}
```

**Templates:**
- `database.dart.template` - Main database class
- `table.dart.template` - Table definition
- `dao.dart.template` - Data access object
- `web_database.dart.template` - WASM + OPFS setup
- `native_database.dart.template` - FFI setup
- `migration.dart.template` - Schema migrations
- `key_manager.dart.template` - Encryption keys

**MCP Tools:**
- `drift_add_table`
- `drift_add_relation`
- `drift_generate_dao`
- `drift_create_migration`
- `drift_enable_encryption`
- `drift_run_codegen`

### 4.2 PWA Module (Phase 3)

**Config Schema:**
```typescript
{
  manifest: {
    name: string;
    shortName: string;
    display: 'standalone' | 'fullscreen' | 'minimal-ui';
    themeColor: string;
    backgroundColor: string;
  };
  serviceWorker: {
    strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
    precache: string[];
    runtimeCache: CacheRule[];
  };
  installPrompt: {
    enabled: boolean;
    delay: number;
  };
}
```

**Templates:**
- `manifest.json.template`
- `sw.js.template` - Service worker
- `pwa_service.dart.template` - Install prompt, update detection
- `offline_page.dart.template`
- `connectivity_service.dart.template`

**MCP Tools:**
- `pwa_configure_manifest`
- `pwa_generate_icons`
- `pwa_configure_caching`
- `pwa_add_offline_page`
- `pwa_configure_install_prompt`
- `pwa_validate`

### 4.3 State Module (Phase 4)

**Config Schema:**
```typescript
{
  solution: 'riverpod' | 'bloc';
  features: {
    offlineSync: boolean;
    optimisticUpdates: boolean;
    persistState: boolean;
    undoRedo: boolean;
  };
  architecture: 'clean' | 'feature-first' | 'layer-first';
}
```

**Templates:**
- `offline_notifier.dart.template` - Riverpod with offline support
- `offline_bloc.dart.template` - BLoC with offline support
- `sync_queue.dart.template` - Pending changes queue
- `connectivity_notifier.dart.template`

**MCP Tools:**
- `state_create_provider`
- `state_create_bloc`
- `state_generate_feature`
- `state_add_sync_queue`

### 4.4 Security Module (Phase 5)

**Config Schema:**
```typescript
{
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
    keyDerivation: 'PBKDF2' | 'Argon2';
  };
  secureStorage: {
    provider: 'flutter_secure_storage' | 'web_crypto';
    biometricProtection: boolean;
  };
  validation: {
    sanitizeInput: boolean;
    preventSqlInjection: boolean;
    xssProtection: boolean;
  };
}
```

**Templates:**
- `encryption_service.dart.template`
- `key_manager.dart.template`
- `input_validator.dart.template`
- `secure_storage_service.dart.template`
- `audit_logger.dart.template`

**MCP Tools:**
- `security_enable_encryption`
- `security_add_validation`
- `security_audit`
- `security_classify_data`

### 4.5 Build Module (Phase 6)

**Config Schema:**
```typescript
{
  webOptimization: {
    treeShaking: boolean;
    minify: boolean;
    splitChunks: boolean;
    renderer: 'html' | 'canvaskit' | 'auto';
  };
  headers: {
    coopCoep: boolean;  // Required for SharedArrayBuffer/WASM
    csp: string;
  };
  deployment: {
    provider: 'vercel' | 'netlify' | 'firebase' | 'cloudflare';
  };
}
```

**Templates:**
- `vercel.json.template`
- `netlify.toml.template`
- `firebase.json.template`
- `Dockerfile.template`
- `github-actions.yaml.template`

**MCP Tools:**
- `project_create`
- `project_build`
- `project_configure_deployment`
- `project_generate_ci`
- `project_validate`
- `project_analyze`

---

## PART 5: COMBINED MCP TOOLS LIST

### From mcp_server_structure (24 tools)

| Phase | Module | Tools |
|-------|--------|-------|
| 1 | Core | `module_list`, `module_info`, `template_preview` |
| 2 | Drift | `drift_add_table`, `drift_add_relation`, `drift_generate_dao`, `drift_create_migration`, `drift_enable_encryption`, `drift_run_codegen` |
| 3 | PWA | `pwa_configure_manifest`, `pwa_generate_icons`, `pwa_configure_caching`, `pwa_add_offline_page`, `pwa_configure_install_prompt`, `pwa_validate` |
| 4 | State | `state_create_provider`, `state_create_bloc`, `state_generate_feature`, `state_add_sync_queue` |
| 5 | Security | `security_enable_encryption`, `security_add_validation`, `security_audit`, `security_classify_data` |
| 6 | Build | `project_create`, `project_build`, `project_configure_deployment`, `project_generate_ci`, `project_validate`, `project_analyze` |

### From flutterorchestrator (Reusable - 20+ tools)

| Category | Tools |
|----------|-------|
| Code Gen | `generate_flutter_widget`, `generate_bloc_pattern`, `generate_api_client` |
| Visual | `generate_theme`, `create_animation` |
| Tracking | `create_tracked_screen`, `add_tracked_widget`, `get_widget_tree`, `generate_tracked_code` |
| State | `setup_state_management` |
| Testing | `generate_tests` |
| Deploy | `generate_ci_cd_pipeline`, `configure_platform_specific` |
| UI | `generate_ui_component` |
| A11y | `audit_accessibility`, `generate_i18n` |

### From visual-flutter-generator (Reusable - 15+ tools)

| Category | Tools |
|----------|-------|
| Analysis | `analyze_screenshot`, `extract_theme`, `detect_design_system` |
| Generation | `generate_flutter_code`, `generate_complete_app`, `generate_component_library` |
| State | `generate_state_management` |
| Navigation | `generate_navigation` |
| Validation | `validate_flutter_code`, `validate_code_quality`, `validate_project_structure` |
| Export | `export_flutter_project`, `scaffold_flutter_project` |
| Learning | `record_generation`, `record_feedback`, `get_learning_insights` |

---

## PART 6: FINAL PROJECT STRUCTURE

```
offline-flutter-pwa-builder/
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── UNIFIED_IMPLEMENTATION_BLUEPRINT.md
│
├── src/
│   ├── index.ts                       # MCP server entry
│   │
│   ├── core/                          # PHASE 1
│   │   ├── project-engine/
│   │   │   ├── index.ts
│   │   │   ├── project-definition.ts
│   │   │   ├── project-factory.ts
│   │   │   └── project-validator.ts
│   │   ├── template-engine/
│   │   │   ├── index.ts
│   │   │   ├── template-registry.ts
│   │   │   ├── template-renderer.ts    # Handlebars
│   │   │   └── transforms/
│   │   ├── module-system/
│   │   │   ├── index.ts
│   │   │   ├── module-registry.ts
│   │   │   ├── module-loader.ts
│   │   │   └── hook-executor.ts
│   │   ├── validation-framework/
│   │   │   ├── index.ts
│   │   │   ├── validator-registry.ts
│   │   │   └── validators/
│   │   ├── security-framework/
│   │   │   ├── index.ts
│   │   │   └── policies/
│   │   ├── filesystem/
│   │   │   ├── index.ts
│   │   │   ├── local-filesystem.ts
│   │   │   └── memory-filesystem.ts
│   │   ├── communication/              # From flutterorchestrator
│   │   │   ├── protocol.ts
│   │   │   └── websocket-server.ts
│   │   └── tracking/                   # From flutterorchestrator
│   │       ├── widget-tracker.ts
│   │       └── screen-registry.ts
│   │
│   ├── modules/
│   │   ├── drift/                      # PHASE 2
│   │   │   ├── index.ts
│   │   │   ├── config.ts
│   │   │   ├── hooks.ts
│   │   │   ├── tools.ts
│   │   │   └── templates/
│   │   ├── pwa/                        # PHASE 3
│   │   │   ├── index.ts
│   │   │   ├── hooks.ts
│   │   │   ├── tools.ts
│   │   │   ├── icon-generator.ts
│   │   │   └── templates/
│   │   ├── state/                      # PHASE 4
│   │   │   ├── index.ts
│   │   │   ├── hooks.ts
│   │   │   ├── tools.ts
│   │   │   └── templates/
│   │   ├── security/                   # PHASE 5
│   │   │   ├── index.ts
│   │   │   ├── hooks.ts
│   │   │   ├── tools.ts
│   │   │   └── templates/
│   │   └── build/                      # PHASE 6
│   │       ├── index.ts
│   │       ├── tools.ts
│   │       └── templates/
│   │
│   ├── analysis/                       # From visual-flutter-generator
│   │   ├── visual-analyzer.ts
│   │   ├── theme-extractor.ts
│   │   └── pattern-detector.ts
│   │
│   ├── generation/                     # Combined
│   │   ├── code-generator.ts
│   │   ├── widget-generator.ts
│   │   ├── screen-generator.ts
│   │   └── app-generator.ts
│   │
│   ├── learning/                       # From visual-flutter-generator
│   │   ├── learning-system.ts
│   │   ├── pattern-library.ts
│   │   └── analytics.ts
│   │
│   ├── tools/                          # MCP tool aggregation
│   │   └── index.ts
│   │
│   ├── resources/                      # MCP resources
│   │   └── index.ts
│   │
│   └── handlers/                       # From flutterorchestrator
│       ├── codeGeneration.ts
│       ├── visualDesign.ts
│       ├── stateManagement.ts
│       ├── testing.ts
│       └── deployment.ts
│
├── schemas/
│   ├── project.schema.json
│   ├── module.schema.json
│   └── template.schema.json
│
├── assets/
│   ├── sqlite3.wasm
│   └── drift_worker.js
│
└── tests/
    ├── core/
    └── modules/
```

---

## PART 7: IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Week 1)
1. Set up MCP server with SDK
2. Implement FileSystem abstraction
3. Implement Template Engine (Handlebars)
4. Implement Module System with hooks
5. **Reuse:** MCP server setup from flutterorchestrator

### Phase 2: Drift + PWA (Week 2)
1. Implement Drift module with all templates
2. Implement PWA module with service workers
3. **Reuse:** Code generation patterns from flutterorchestrator

### Phase 3: State + Security (Week 3)
1. Implement State module (Riverpod/BLoC)
2. Implement Security module
3. **Reuse:** State management templates from visual-flutter-generator

### Phase 4: Build + Polish (Week 4)
1. Implement Build module with deployment configs
2. Add validation framework
3. Add learning system
4. **Reuse:** Validation from visual-flutter-generator, CI/CD from flutterorchestrator

---

## PART 8: KEY DECISIONS

### Offline-First PWA Focus
- Drift + WASM + OPFS for browser SQLite
- Service Workers for asset caching
- Sync queue for offline changes
- Optimistic updates

### No AI for Now
- Focus on deterministic code generation
- Template-based approach
- Pattern matching from visual-flutter-generator (optional)
- AI integration deferred to future

### Reuse Strategy
- **Direct Copy:** MCP server setup, widget tracking, communication protocol
- **Adapt:** Code generation, theme generation, navigation
- **Reference:** Security patterns, validation rules

---

## SUMMARY

| Metric | Value |
|--------|-------|
| Total Source Lines | ~33,000 |
| Reusable Lines | ~25,000 (75%) |
| MCP Tools Defined | 60+ |
| Modules | 6 |
| Templates | 50+ |
| Estimated Build Time | 4 weeks |
