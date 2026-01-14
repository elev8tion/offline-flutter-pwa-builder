# Visual Flutter Generator - Complete Extraction for Offline PWA Builder

**Source**: `/Users/kcdacre8tor/visual-flutter-generator`
**Version**: 1.0.0 (Production Ready)
**Date Extracted**: 2026-01-12
**Total Lines of Code**: 15,000+

---

## 1. PROJECT STRUCTURE (COMPLETE DIRECTORY TREE)

```
visual-flutter-generator/
├── mcp-server/
│   └── server.js                          (1,570 lines - Complete MCP Server)
│
├── core/
│   ├── visual-analyzer/
│   │   └── index.js                       (500+ lines - Screenshot analysis, OCR, element detection)
│   │
│   ├── code-generator/
│   │   ├── index.js                       (300+ lines - Code generation orchestration)
│   │   ├── components.js                  (400+ lines - Component library generation)
│   │   ├── state-management.js            (550+ lines - Provider, Riverpod, BLoC generation)
│   │   ├── navigation.js                  (548 lines - GoRouter, Navigator2, basic nav)
│   │   ├── responsive.js                  (Responsive layout generation)
│   │   └── design-system.js               (Design system pattern application)
│   │
│   ├── pattern-detector/
│   │   ├── index.js                       (500+ lines - Edge detection, color clustering, UI patterns)
│   │   ├── design-system.js               (Design system detection: Material, Cupertino, Custom)
│   │   └── multi-screen.js                (Multi-screen flow, navigation graph analysis)
│   │
│   └── orchestrator/
│       └── index.js                       (Generation orchestration)
│
├── pipeline/
│   ├── preprocessor/
│   │   └── index.js                       (Image preprocessing for analysis)
│   │
│   ├── validator/
│   │   └── index.js                       (400+ lines - Code validation, quality metrics)
│   │
│   └── exporter/
│       ├── index.js                       (Export pipeline coordination)
│       ├── scaffolder.js                  (Flutter project scaffolding)
│       ├── git-init.js                    (Git repository initialization)
│       └── formats/
│           ├── standalone.js              (Standalone Flutter project export)
│           └── flutterflow.js             (FlutterFlow-compatible format)
│
├── learning/
│   ├── index.js                           (Learning system coordinator)
│   │
│   ├── database/
│   │   ├── index.js                       (SQLite database manager)
│   │   └── schema.js                      (Database schema definition)
│   │
│   ├── feedback-loop/
│   │   └── index.js                       (Feedback processing)
│   │
│   ├── pattern-library/
│   │   └── index.js                       (Pattern management and matching)
│   │
│   └── analytics/
│       ├── index.js                       (Analytics dashboard)
│       ├── ab-testing.js                  (A/B testing framework)
│       └── dashboard.js                   (HTML dashboard generation)
│
├── preview/
│   └── comparator/
│       └── index.js                       (Screenshot comparison with SSIM metrics)
│
├── cli/
│   └── batch-processor.js                 (280+ lines - Batch processing)
│
├── cli.js                                 (683 lines - CLI entry point, 11 commands)
├── package.json                           (Dependencies)
├── config.example.json                    (Configuration template)
├── FINAL_SUMMARY.md                       (26KB comprehensive summary)
├── README.md                              (Complete documentation)
└── test files/                            (Integration tests, examples)
```

---

## 2. MCP SERVER IMPLEMENTATION

### File: `mcp-server/server.js` (1,570 lines)

**Purpose**: Exposes all visual analysis and code generation capabilities through MCP protocol

**Class**: `VisualFlutterMCPServer`

**Key Subsystems Integrated**:
- VisualAnalyzer (screenshot analysis)
- VisualToCodeGenerator (code generation)
- MultiScreenFlowDetector (multi-screen analysis)
- CodeValidator (validation)
- ProjectScaffolder (project creation)
- ExportPipeline (export coordination)
- ScreenshotComparator (visual validation)
- LearningSystem (feedback & patterns)

**Server Configuration**:
```javascript
{
  name: 'visual-flutter-generator',
  version: '1.0.0',
  capabilities: { tools: {} }
}
```

### MCP Tool Definitions (26 Total Tools)

#### Screenshot Analysis Tools (4 tools)
1. **analyze_screenshot**
   - Input: `imagePath` (required), `options` (optional)
   - Options: `extractText` (boolean), `detectPatterns` (boolean)
   - Returns: UI elements, patterns, text, affordances, navigation structure, theme, design system

2. **extract_theme**
   - Input: `imagePath` (required)
   - Returns: Primary, secondary, background, surface, text colors

3. **detect_design_system**
   - Input: `imagePath` (required)
   - Returns: Material/Cupertino/Custom detection with accuracy

4. **compare_screenshots**
   - Input: `originalPath`, `generatedPath`, `metrics`, `outputDiffPath`
   - Returns: Pixel similarity, structural (SSIM), visual (histogram), layout metrics

#### Code Generation Tools (5 tools)
5. **generate_flutter_code**
   - Input: `imagePath`, `widgetName` (default: "GeneratedScreen"), `options`
   - Options: `stateful`, `includeNavigation`, `stateManagement` (none/provider/riverpod/bloc/getx)
   - Returns: Complete Flutter widget code with imports and dependencies

6. **generate_complete_app**
   - Input: `screenshots[]` (name, path), `appName`, `outputPath`, `stateManagement`, `navigationPattern`, `responsive`
   - Returns: Full app with multiple screens, navigation, state management

7. **generate_component_library**
   - Input: `imagePath`, `outputPath`
   - Returns: Reusable component files (buttons, cards, inputs, etc.)

8. **generate_state_management**
   - Input: `imagePath`, `pattern` (provider/riverpod/bloc)
   - Returns: State management code files

9. **generate_navigation**
   - Input: `screenshots[]`, `pattern` (go_router/navigator2/basic)
   - Returns: Navigation implementation files

#### Validation & Export Tools (5 tools)
10. **validate_flutter_code**
    - Input: `code`, `checkImports` (boolean)
    - Returns: Validation results with issues list

11. **validate_code_quality**
    - Input: `code`, `filename`, `checkQuality`
    - Returns: Quality metrics, complexity, maintainability index

12. **validate_project_structure**
    - Input: `projectPath`
    - Returns: Complete project validation report

13. **export_flutter_project**
    - Input: `generatedApp`, `outputPath`, `format`, `validateCode`, `initGit`, `runTests`
    - Returns: Export report with all stages

14. **scaffold_flutter_project**
    - Input: `projectPath`, `appName`, `organization`, `platforms`, `stateManagement`, `navigationPattern`
    - Returns: Project structure creation report

#### Learning System Tools (11 tools)
15. **record_generation**
    - Input: `generation` object with id, strategy, code_quality_score, validation_passed, etc.
    - Returns: Confirmation with generation ID

16. **record_feedback**
    - Input: `feedback` object with generation_id, feedback_type, rating, comment
    - Returns: Confirmation

17. **get_learning_insights**
    - Input: `timeframe` (days, default 30)
    - Returns: Feedback insights, pattern stats, analytics insights, recommendations

18. **generate_analytics_dashboard**
    - Input: `outputPath`, `timeframe`
    - Returns: HTML dashboard file path

19. **get_top_patterns**
    - Input: `limit` (default 10)
    - Returns: Top patterns by success rate and usage

20. **find_matching_patterns**
    - Input: `visualSignature`, `threshold` (default 0.7)
    - Returns: Matching patterns with similarity scores

21. **save_successful_pattern**
    - Input: `pattern` object with pattern_name, pattern_type, code_template, tags
    - Returns: Pattern ID and confirmation

22. **export_learning_data**
    - Input: `outputDir`
    - Returns: patterns.json, analytics.json, insights.json, dashboard.html

23. **record_generation** (Learning variant)
24. **record_feedback** (Learning variant)
25. **get_learning_insights**
26. **generate_analytics_dashboard**

---

## 3. ALL TOOL DEFINITIONS (Complete Reference)

### Tool Handler Pattern
```javascript
this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'tool_name',
      description: 'What it does',
      inputSchema: {
        type: 'object',
        properties: { /* input parameters */ },
        required: [ /* required params */ ]
      }
    },
    // ... more tools
  ]
}));
```

### Tool Implementation Handler
```javascript
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'tool_name':
      return await this.handleTool(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

---

## 4. SCREENSHOT/VISUAL ANALYSIS ENGINE

### Core Component: `VisualAnalyzer` (500+ lines)

**Main Method**: `analyzeScreenshot(imagePath)`

**Processing Pipeline**:
1. **Validate image exists** → File access check
2. **Cache check** → 10-minute cache for repeated analyses
3. **Get image metadata** → Width, height, format
4. **Preprocess image** → Normalize, enhance contrast
5. **Parallel processing** (3 tasks):
   - Detect UI elements
   - Extract text (OCR)
   - Analyze color regions
6. **Advanced detection** (parallel):
   - Edge detection (Sobel operator)
   - Color clustering (k-means, 8 clusters)
   - UI pattern detection
7. **Theme extraction** → Primary, secondary, background colors
8. **Navigation structure inference** → Bottom nav, drawer, tabs, back button
9. **Design system detection** → Material, Cupertino, or Custom

**Output Structure**:
```javascript
{
  screenshot: { path, width, height, format },
  elements: [
    {
      type: 'button' | 'text' | 'input' | 'image' | 'container' | 'navigation',
      bounds: { x, y, width, height },
      properties: { text, isInteractive, ... },
      confidence: 0.0-1.0
    }
  ],
  patterns: [
    {
      type: 'button' | 'card' | 'list' | 'navbar' | 'tabbar',
      confidence: 0.0-1.0,
      bounds: { x, y, width, height },
      characteristics: { ... }
    }
  ],
  text: {
    raw: "Extracted text",
    structured: [
      { text: "word", confidence: 0.99, bounds: {...} }
    ]
  },
  affordances: [
    {
      element: { ... },
      navigationType: 'tap' | 'swipe',
      targetHint: "description",
      confidence: 0.0-1.0
    }
  ],
  navigationStructure: {
    hasBottomNav: boolean,
    hasDrawer: boolean,
    hasTabs: boolean,
    hasBackButton: boolean
  },
  theme: {
    primary: "#2196F3",
    secondary: "#FF9800",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#000000"
  },
  designSystem: {
    designSystem: 'material' | 'cupertino' | 'custom',
    confidence: 0.0-1.0
  },
  colorClusters: [
    {
      color: { r, g, b },
      hexColor: "#RRGGBB",
      percentage: 15.5,
      pixels: 1200
    }
  ],
  timestamp: Date.now()
}
```

### Key Helper Methods

**Element Detection**:
- `detectUIElements(imageBuffer, metadata)` → Buttons, inputs, navigation
- `detectButtonPatterns(data, info)` → Rounded rectangles with fill
- `detectInputFields(data, info)` → Wide, shallow rectangular fields
- `detectNavigationElements(data, info, metadata)` → Bottom nav, drawers

**Text Extraction**:
- `extractText(imageBuffer)` → OCR using Tesseract.js
- Returns raw text + structured word blocks with confidence scores

**Color Analysis**:
- `analyzeColorRegions(buffer, metadata)` → Dominant colors by region
- k-means clustering with configurable cluster count (default 8)

**Navigation Structure**:
- `inferNavigationStructure(elements, metadata)` → Detect UI navigation patterns
- Identifies: bottom nav, drawer, tabs, back buttons

**Design System Detection**:
- Analyzes patterns, colors, layout to determine Material/Cupertino/Custom

---

## 5. CODE GENERATION ENGINE

### Core Component: `VisualToCodeGenerator` (300+ lines)

**Main Method**: `generateFromAnalysis(analysis, widgetName, options)`

**Options**:
```javascript
{
  responsive: true,           // Generate responsive layouts
  includeNavigation: true,    // Include navigation code
  stateManagement: 'none',    // 'none', 'provider', 'riverpod', 'bloc', 'getx'
  designSystem: 'material'    // 'material', 'cupertino', 'custom'
}
```

### Generation Process

1. **Layout Inference** → `inferLayoutStructure(analysis)`
   - Detect grid, list, stack, or column layouts
   - Calculate spacing and sizing

2. **Style Extraction** → `extractStyles(theme, colorClusters)`
   - Primary, secondary, accent colors
   - Typography (sizes, weights)
   - Spacing values

3. **Widget Tree Building** → `buildWidgetTree(layout, styles, analysis)`
   - Create nested widget hierarchy
   - Apply constraints and sizing
   - Add styling

4. **Code Generation** → `generateFlutterCode(widgetName, widgetTree, styles)`
   - Convert widget tree to Dart code
   - Add proper indentation (2 spaces)
   - Include best practices

5. **Import Determination** → `determineImports(widgetTree)`
   - Required Flutter imports
   - Material or Cupertino
   - Custom packages

6. **Design System Application** → `applyDesignSystemPatterns(code, designSystem)`
   - Replace Material with Cupertino widgets if needed
   - Apply design-specific patterns

### Generated Code Structure

```dart
import 'package:flutter/material.dart';

class WidgetName extends StatelessWidget {
  const WidgetName({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(...),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [...]
          ),
        ),
      ),
    );
  }
}
```

### Complete App Generation

**Method**: `generateCompleteApp(multiScreenFlow, options)`

**Output Files**:
1. Component library (buttons, cards, inputs, etc.)
2. Theme file (AppTheme with light/dark themes)
3. Constants file (spacing, colors, typography)
4. Custom widgets
5. Navigation code (GoRouter/Navigator2/basic)
6. State management code (Provider/Riverpod/BLoC)
7. Screen files (one per screenshot)
8. main.dart
9. pubspec.yaml

**pubspec.yaml Generation**:
```yaml
name: app_name
description: Generated Flutter app
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
  [state management packages]
  [navigation packages]

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

---

## 6. COMPONENT LIBRARY GENERATION

### File: `core/code-generator/components.js` (400+ lines)

**Method**: `generateComponentLibrary(analysis)`

**Generated Components**:

1. **AppButton** - Reusable button component
   - Type: primary, secondary, outline, text
   - Features: loading state, icon support, width control
   - Material and Cupertino support

2. **AppCard** - Container card component
   - Properties: elevation, padding, background color, border radius
   - onTap handler support
   - InfoCard variant with icon and subtitle

3. **AppInput** - Text input field
   - Validation support
   - Error state handling
   - Material and Cupertino styles

4. **ListItem** - Reusable list item component
   - Icon, title, subtitle support
   - Trailing widget support
   - Divider rendering

5. **AppBottomNav** - Bottom navigation bar
   - Multiple items with icons and labels
   - Active state management
   - Custom styling

6. **AppTabBar** - Tab navigation component
   - Scrollable tabs
   - Custom styling
   - Tab content handling

### Component File Structure

```
lib/components/
├── buttons/
│   └── app_button.dart        (AppButton, AppPrimaryButton variants)
├── cards/
│   └── app_card.dart          (AppCard, InfoCard)
├── inputs/
│   └── app_input.dart         (AppInput with validation)
├── lists/
│   └── list_item.dart         (ListItem component)
├── navigation/
│   ├── bottom_nav.dart
│   └── tab_bar.dart
└── custom/
    └── [app-specific components]
```

### Theme File Generation

```dart
class AppTheme {
  static ThemeData lightTheme = ThemeData(
    primaryColor: ...,
    scaffoldBackgroundColor: ...,
    colorScheme: ColorScheme.light(
      primary: ...,
      secondary: ...,
      surface: ...,
    ),
    textTheme: TextTheme(
      displayLarge: ...,
      titleLarge: ...,
      bodyLarge: ...,
    ),
    // ... more customizations
  );

  static ThemeData darkTheme = ThemeData(
    // ... dark theme variants
  );
}
```

---

## 7. STATE MANAGEMENT GENERATION

### File: `core/code-generator/state-management.js` (550+ lines)

**Supported Patterns**: Provider, Riverpod, BLoC, GetX

### A. PROVIDER PATTERN

**Files Generated**:
1. `lib/providers/app_state.dart` - Main application state
2. `lib/providers/navigation_provider.dart` - Navigation state
3. `lib/providers/form_provider.dart` - Form state and validation
4. `lib/providers/data_provider.dart` - Data/list state
5. `lib/providers/theme_provider.dart` - Theme switching

**AppState Example**:
```dart
class AppState extends ChangeNotifier {
  int _selectedIndex = 0;
  bool _isLoading = false;
  String? _error;

  int get selectedIndex => _selectedIndex;
  void setSelectedIndex(int index) {
    _selectedIndex = index;
    notifyListeners();
  }
  // ... more methods
}
```

**Usage in main.dart**:
```dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => AppState()),
    ChangeNotifierProvider(create: (_) => NavigationProvider()),
    // ... more providers
  ],
  child: MyApp(),
)
```

### B. RIVERPOD PATTERN

**Files Generated**:
1. `lib/providers/app_providers.dart` - All Riverpod providers

**StateProvider Example**:
```dart
final navigationIndexProvider = StateProvider<int>((ref) => 0);

class DataNotifier extends StateNotifier<List<dynamic>> {
  DataNotifier() : super([]);
  
  Future<void> loadData() async { ... }
  void addItem(dynamic item) { ... }
}

final dataProvider = StateNotifierProvider<DataNotifier, List<dynamic>>(
  (ref) => DataNotifier(),
);
```

**Usage**:
```dart
ConsumerWidget build(BuildContext context, WidgetRef ref) {
  final index = ref.watch(navigationIndexProvider);
  return Widget();
}
```

### C. BLOC PATTERN

**Files Generated**:
1. `lib/blocs/navigation/navigation_bloc.dart` - Navigation logic
2. `lib/blocs/navigation/navigation_event.dart` - Navigation events
3. `lib/blocs/navigation/navigation_state.dart` - Navigation state
4. `lib/blocs/data/data_bloc.dart` - Data management

**Example**:
```dart
class NavigationBloc extends Bloc<NavigationEvent, NavigationState> {
  NavigationBloc() : super(NavigationState(currentIndex: 0)) {
    on<NavigateToIndex>((event, emit) {
      emit(NavigationState(currentIndex: event.index));
    });
  }
}
```

---

## 8. NAVIGATION GENERATION

### File: `core/code-generator/navigation.js` (548 lines)

**Supported Patterns**: GoRouter (recommended), Navigator 2.0, Basic Navigation

### A. GO_ROUTER PATTERN (Recommended)

**Files Generated**:
1. `lib/router/app_router.dart` - GoRouter configuration
2. `lib/router/route_names.dart` - Route name constants

**Implementation**:
```dart
class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: RouteNames.home,
        builder: (context, state) => HomeScreen(),
        routes: [
          GoRoute(
            path: 'details/:id',
            name: RouteNames.details,
            builder: (context, state) => DetailsScreen(
              id: state.pathParameters['id']
            ),
          ),
        ],
      ),
    ],
    redirect: (context, state) {
      // Auth checks, etc.
    },
    errorBuilder: (context, state) => ErrorScreen(),
  );
}
```

**Route Names**:
```dart
class RouteNames {
  static const home = 'home';
  static const details = 'details';
  static const profile = 'profile';
}
```

**Usage**:
```dart
context.go('/');                              // Push to home
context.push('/details/123');                 // Push details
context.goNamed(RouteNames.profile);          // Named navigation
context.pop();                                // Pop current route
```

### B. NAVIGATOR 2.0 PATTERN

**Files Generated**:
1. `lib/navigation/app_route_information_parser.dart`
2. `lib/navigation/app_router_delegate.dart`
3. `lib/navigation/app_state.dart`

**Components**:
- `AppRoutePath` - Route state object
- `AppRouteInformationParser` - Parse URL to app state
- `AppRouterDelegate` - Handle navigation

### C. BASIC NAVIGATION

**Simple named routes**:
```dart
MaterialApp(
  initialRoute: '/',
  routes: {
    '/': (context) => HomeScreen(),
    '/details': (context) => DetailsScreen(),
  },
  onGenerateRoute: (settings) { ... },
)
```

---

## 9. THEME EXTRACTION

### Core Method: `extractThemeColors(colorClusters)`

**Algorithm**:
1. Sort color clusters by percentage (dominant first)
2. **Background** = most dominant color
3. **Text** = high contrast color to background
4. **Primary** = vibrant color (not background)
5. **Secondary** = less dominant vibrant color
6. **Surface** = neutral color for cards

**Output**:
```javascript
{
  primary: "#2196F3",           // Primary brand color
  secondary: "#FF9800",         // Secondary accent
  background: "#FFFFFF",        // Screen background
  surface: "#F5F5F5",           // Card/elevation surface
  text: "#000000",              // Primary text
  textSecondary: "#666666",     // Secondary text
  error: "#F44336"              // Error color (inferred)
}
```

**Color Properties Extracted**:
- Hex color codes
- RGB values
- Percentage of screen coverage
- Regional distribution
- Vibrancy (saturation + brightness)

---

## 10. VALIDATION SYSTEMS

### File: `pipeline/validator/index.js` (400+ lines)

**Validation Layers**:

### 1. SYNTAX VALIDATION
- **Brace matching** - {}, [], ()
- **String literals** - Proper escaping, quotes
- **Class structure** - class keyword, inheritance
- **Method structure** - Return types, parameters
- **Import statements** - Valid format, duplicates

**Example**:
```javascript
validateDartSyntax(code, filename) {
  const issues = [];
  issues.push(...this._checkBraceMatching(code));
  issues.push(...this._checkImports(code));
  issues.push(...this._checkClassStructure(code));
  // ... more checks
  return { valid: issues.length === 0, issues };
}
```

### 2. FLUTTER ANALYZER
Runs `flutter analyze` on generated code:
- Lint warnings
- Style issues
- Best practice violations
- Deprecation warnings

### 3. CODE QUALITY
- **Maintainability Index**: Target 85+ (0-100 scale)
- **Cyclomatic Complexity**: Target <10 per method
- **Lines of Code**: 100-500 per widget
- **Naming conventions**: camelCase, PascalCase
- **Documentation**: Dart doc comments

**Quality Metrics**:
```javascript
{
  linesOfCode: 250,
  complexity: 6,
  maintainabilityIndex: 92,
  cyclomaticComplexity: 4,
  documentationRatio: 0.85
}
```

### 4. BEST PRACTICES
- Const constructors
- Proper use of Keys
- Error handling
- Widget rebuild prevention
- Memory leak prevention

---

## 11. EXPORT & SCAFFOLDING

### Export Pipeline: `pipeline/exporter/index.js`

**Stages**:
1. **Code Validation** - Syntax and quality checks
2. **Project Scaffolding** - Create directory structure
3. **File Generation** - Write all generated files
4. **Format Conversion** - Standalone or FlutterFlow
5. **Git Initialization** - Create Git repository
6. **Project Validation** - flutter analyze, pub get
7. **Screenshot Comparison** - Visual validation
8. **Testing** - Run flutter test

**Output**: Complete, buildable Flutter project

### Scaffolder: `pipeline/exporter/scaffolder.js`

**Directory Structure Generated**:
```
project-name/
├── lib/
│   ├── main.dart
│   ├── screens/                # Generated screens
│   ├── components/             # Reusable components
│   ├── providers/              # State management
│   ├── router/                 # Navigation
│   ├── models/                 # Data models
│   ├── services/               # API services
│   ├── utils/                  # Utilities
│   ├── constants/              # Constants
│   └── theme/                  # Theme files
├── test/
│   ├── widget_test.dart        # Template test
│   └── integration_test/       # Integration tests
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
├── android/                    # Android native files
├── ios/                        # iOS native files
├── web/                        # Web files
├── pubspec.yaml               # Dependencies
├── pubspec.lock               # Lock file
├── analysis_options.yaml      # Lint rules
├── .gitignore                 # Git ignore
├── .metadata                  # Flutter metadata
└── README.md                  # Project README
```

**pubspec.yaml Generation**:
```yaml
name: app_name
description: Generated Flutter application
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
  provider: ^6.1.0           # if selected
  go_router: ^12.0.0         # if selected
  flutter_riverpod: ^2.4.0   # if selected
  flutter_bloc: ^8.1.0       # if selected

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
  fonts:
    - family: CustomFont
      fonts:
        - asset: assets/fonts/CustomFont.ttf
```

---

## 12. LEARNING & ANALYTICS SYSTEM

### File: `learning/index.js` (Learning System Coordinator)

**Architecture**:
- **Database**: SQLite (7 core tables)
- **Feedback Loop**: User ratings and corrections
- **Pattern Library**: Stores successful patterns
- **Analytics**: Event tracking and insights
- **A/B Testing**: Statistical comparison

### Database Schema (7 Tables)

**1. feedback table**
```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY,
  generation_id TEXT,
  user_id TEXT,
  rating INTEGER (1-5),
  feedback_type TEXT ('positive', 'negative', 'correction', 'suggestion'),
  component_type TEXT,
  original_code TEXT,
  corrected_code TEXT,
  comment TEXT,
  created_at DATETIME
);
```

**2. patterns table**
```sql
CREATE TABLE patterns (
  id INTEGER PRIMARY KEY,
  pattern_name TEXT UNIQUE,
  pattern_type TEXT,
  description TEXT,
  visual_signature TEXT,
  code_template TEXT,
  success_count INTEGER,
  usage_count INTEGER,
  avg_rating REAL,
  tags TEXT,
  created_at DATETIME
);
```

**3. generations table**
```sql
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  screenshot_hash TEXT,
  strategy TEXT,
  patterns_used TEXT,
  generation_time_ms INTEGER,
  code_quality_score REAL,
  validation_passed INTEGER,
  export_format TEXT,
  created_at DATETIME
);
```

**4. analytics_events table**
```sql
CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY,
  event_type TEXT,
  event_category TEXT,
  event_data TEXT,
  generation_id TEXT,
  timestamp DATETIME
);
```

**5-7. ab_tests, ab_test_results, pattern_usage tables**
(See schema.js for complete definitions)

### Learning Methods

**Record Generation**:
```javascript
await learning.recordGeneration({
  id: 'gen_001',
  screenshot_hash: 'abc123',
  strategy: 'pattern_based',
  patterns_used: [
    { pattern_name: 'button', confidence: 0.92, modified: false }
  ],
  generation_time_ms: 850,
  code_quality_score: 92,
  validation_passed: true,
  export_format: 'standalone'
});
```

**Record Feedback**:
```javascript
await learning.recordFeedback({
  generation_id: 'gen_001',
  feedback_type: 'positive',          // positive, negative, correction
  rating: 5,
  comment: 'Generated code matches design perfectly',
  corrected_code: null                // if correcting
});
```

**Get Insights**:
```javascript
const insights = await learning.getInsights();
// Returns:
// {
//   feedback_insights: { avg_rating, correction_count, ... },
//   pattern_stats: { total_patterns, top_patterns, ... },
//   analytics_insights: { total_generations, success_rate, ... },
//   recommendations: [ "Use pattern X more", ... ]
// }
```

**Find Matching Patterns**:
```javascript
const matches = learning.patterns.findMatchingPatterns(
  {
    component_types: ['button', 'form'],
    layout_type: 'vertical',
    dominant_colors: ['#2196F3']
  },
  threshold = 0.7
);
```

### Analytics Dashboard

**Generated HTML Dashboard** includes:
- Generation statistics (count, success rate, avg quality)
- Pattern performance (most used, highest rated)
- Feedback trends (ratings over time, correction patterns)
- Learning insights (recommendations, top improvements)
- A/B test results (variant performance comparison)

---

## 13. KEY INTERFACES & TYPES

### Analysis Output Interface

```javascript
interface ScreenshotAnalysis {
  screenshot: {
    path: string;
    width: number;
    height: number;
    format: string;
  };
  elements: UIElement[];
  patterns: DetectedPattern[];
  text: {
    raw: string;
    structured: TextBlock[];
  };
  affordances: NavigationAffordance[];
  navigationStructure: NavigationStructure;
  theme: ThemeColors;
  designSystem: DesignSystemDetection;
  colorClusters: ColorCluster[];
  timestamp: number;
}
```

### Generated Code Interface

```javascript
interface GeneratedCode {
  name: string;
  type: 'StatelessWidget' | 'StatefulWidget';
  imports: string[];
  code: string;
  dependencies: string[];
  designSystem: 'material' | 'cupertino' | 'custom';
}
```

### Generation Result Interface

```javascript
interface GenerationResult {
  appName: string;
  files: FileOutput[];
  stateManagement: string;
  navigationPattern: string;
  setup: {
    navigation: string;
    stateManagement: string;
  };
}
```

### File Output Interface

```javascript
interface FileOutput {
  path: string;              // 'lib/screens/home.dart'
  content: string;           // Complete file content
  type?: string;             // 'screen', 'component', 'state', etc.
  dependencies?: string[];
}
```

---

## 14. PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",  // MCP Protocol
    "sharp": "^0.33.0",                      // Image processing
    "tesseract.js": "^5.0.0",                // OCR (text extraction)
    "commander": "^11.0.0",                  // CLI framework
    "chalk": "^5.3.0",                       // Colored terminal output
    "ora": "^7.0.0",                         // CLI spinners
    "express": "^4.18.0",                    // Web server
    "ws": "^8.14.0",                         // WebSocket
    "better-sqlite3": "^9.0.0"               // SQLite database
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "typescript": "^5.0.0",
    "nodemon": "^3.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

### Key Package Details

| Package | Version | Purpose |
|---------|---------|---------|
| `sharp` | ^0.33.0 | Image resize, normalize, color analysis |
| `tesseract.js` | ^5.0.0 | OCR for text extraction |
| `better-sqlite3` | ^9.0.0 | Fast SQL database for patterns |
| `commander` | ^11.0.0 | CLI command parsing |
| `@modelcontextprotocol/sdk` | ^1.0.0 | MCP server implementation |

---

## 15. GENERATED CODE PATTERNS

### Common Generated Patterns

**1. Screen with State Management (Provider)**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        elevation: 0,
      ),
      body: Consumer<AppState>(
        builder: (context, appState, child) {
          return SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Generated widgets
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
```

**2. Component (Button)**

```dart
enum AppButtonType { primary, secondary, outline, text }

class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final AppButtonType type;
  final IconData? icon;

  const AppButton({
    required this.text,
    this.onPressed,
    this.type = AppButtonType.primary,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: _getBackgroundColor(context),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) Icon(icon),
          if (icon != null) const SizedBox(width: 8),
          Text(text),
        ],
      ),
    );
  }

  Color _getBackgroundColor(BuildContext context) {
    switch (type) {
      case AppButtonType.primary:
        return Theme.of(context).primaryColor;
      case AppButtonType.secondary:
        return Theme.of(context).colorScheme.secondary;
      // ... other cases
      default:
        return Colors.grey;
    }
  }
}
```

**3. Navigation with GoRouter**

```dart
import 'package:go_router/go_router.dart';

class AppRouter {
  static final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const HomeScreen(),
        routes: [
          GoRoute(
            path: 'details/:id',
            name: 'details',
            builder: (context, state) => DetailsScreen(
              id: state.pathParameters['id']!,
            ),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => const ErrorScreen(),
  );
}
```

---

## 16. COMPLETE INTEGRATION EXAMPLE

```javascript
import { VisualAnalyzer } from './core/visual-analyzer/index.js';
import { VisualToCodeGenerator } from './core/code-generator/index.js';
import { MultiScreenFlowDetector } from './core/pattern-detector/multi-screen.js';
import { CodeValidator } from './pipeline/validator/index.js';
import { ExportPipeline } from './pipeline/exporter/index.js';
import { LearningSystem } from './learning/index.js';

async function completeWorkflow(screenshotPath) {
  // 1. Analyze
  const analyzer = new VisualAnalyzer();
  const analysis = await analyzer.analyzeScreenshot(screenshotPath);
  console.log('✅ Analysis complete');

  // 2. Generate code
  const generator = new VisualToCodeGenerator();
  const { code, imports, dependencies } = await generator.generateFromAnalysis(
    analysis,
    'GeneratedScreen',
    { responsive: true, stateManagement: 'provider' }
  );
  console.log('✅ Code generation complete');

  // 3. Validate
  const validator = new CodeValidator();
  const validation = await validator.validateDartSyntax(code);
  if (!validation.valid) {
    console.error('❌ Validation failed:', validation.issues);
    return;
  }
  console.log('✅ Validation passed');

  // 4. Export
  const exporter = new ExportPipeline();
  const exportResult = await exporter.export(
    {
      appName: 'MyApp',
      files: [{ path: 'lib/screens/generated_screen.dart', content: code }],
      stateManagement: 'provider',
      navigationPattern: 'go_router'
    },
    {
      outputPath: './my-app',
      validateCode: true,
      initGit: true
    }
  );
  console.log('✅ Export complete:', exportResult.outputPath);

  // 5. Record for learning
  const learning = new LearningSystem();
  await learning.recordGeneration({
    id: 'gen_' + Date.now(),
    strategy: 'visual_analysis',
    code_quality_score: 92,
    validation_passed: true,
    generation_time_ms: 1500
  });
  console.log('✅ Learning recorded');
}
```

---

## 17. CLI COMMAND REFERENCE

```bash
# Analysis
./cli.js analyze <image>                    # Analyze screenshot
./cli.js theme <image>                      # Extract theme colors

# Generation
./cli.js generate <image>                   # Generate Flutter code
./cli.js create-project <name> <image...>   # Create project

# Complete Workflow
./cli.js workflow <image>                   # Full pipeline
./cli.js batch <directory>                  # Batch processing

# Validation & Export
./cli.js validate <code-file>               # Validate code
./cli.js export <project-dir>               # Export project
./cli.js compare <original> <generated>     # Compare screenshots

# Learning
./cli.js learn --insights                   # Show insights
./cli.js learn --dashboard [path]           # Generate dashboard
./cli.js learn --patterns [limit]           # List top patterns
./cli.js learn --stats                      # Show statistics
```

---

## 18. KEY ALGORITHMS & TECHNIQUES

### Edge Detection (Sobel Operator)

```javascript
// Detects boundaries between different regions
const gx = -1*data[(y-1)*(w)+(x-1)] + 1*data[(y-1)*(w)+(x+1)]
           -2*data[y*(w)+(x-1)] + 2*data[y*(w)+(x+1)]
           -1*data[(y+1)*(w)+(x-1)] + 1*data[(y+1)*(w)+(x+1)];

const strength = Math.sqrt(gx*gx + gy*gy);
```

### K-means Color Clustering

```javascript
// Groups pixels into dominant color clusters
1. Random centroid initialization
2. Assign pixels to nearest centroid
3. Recalculate centroids
4. Repeat until convergence
// Result: ~8 dominant colors with percentages
```

### SSIM (Structural Similarity) for Screenshot Comparison

```javascript
// Compares generated UI with original screenshot
// Returns 0.0 (completely different) to 1.0 (identical)
// Accounts for luminance, contrast, and structure
```

### Layout Inference

```javascript
// Detects grid patterns, list layouts, stack layouts
- Find bounding boxes of elements
- Calculate spacing and alignment
- Determine primary axis (vertical/horizontal)
- Generate appropriate Flutter layout widget
```

---

## 19. CONFIGURATION & CUSTOMIZATION

### config.json Example

```json
{
  "project": {
    "name": "MyFlutterApp",
    "organization": "com.example",
    "description": "Generated from UI screenshots"
  },
  "generation": {
    "defaultStrategy": "pattern_based",
    "stateManagement": "provider",
    "navigationPattern": "go_router",
    "responsive": true,
    "designSystem": "material"
  },
  "learning": {
    "enabled": true,
    "minPatternConfidence": 0.7,
    "recordAnalytics": true,
    "databasePath": "./learning.db"
  },
  "export": {
    "defaultFormat": "standalone",
    "initGit": true,
    "validateCode": true,
    "platforms": ["android", "ios", "web"]
  },
  "validation": {
    "minQualityScore": 80,
    "checkImports": true,
    "checkComplexity": true
  }
}
```

---

## 20. CRITICAL METRICS & BENCHMARKS

### Performance

| Metric | Value |
|--------|-------|
| Single screenshot analysis | ~500ms |
| Code generation | ~800ms |
| Code validation | ~50ms |
| Pattern matching (100 patterns) | ~10ms |
| Complete workflow | ~1.5s |
| Batch processing (10 screenshots) | ~5s (4 workers) |

### Quality

| Metric | Target |
|--------|--------|
| Maintainability index | 85-95 |
| Cyclomatic complexity | <10 |
| Pattern recognition accuracy | 90%+ |
| Code validation success | 95%+ |
| Test pass rate | 100% |

### Database

| Metric | Value |
|--------|-------|
| Pattern match speed (1000 patterns) | <10ms |
| Dashboard generation | ~100ms |
| Analytics query | ~50ms |
| Database size per 1000 generations | ~5MB |

---

## CONCLUSION

The Visual Flutter Generator is a **complete, production-ready system** that can be adapted for offline-first PWA generation. Key reusable components:

1. **Visual Analysis** - Screenshot → UI elements + theme (500ms)
2. **Code Generation** - UI analysis → Flutter code (800ms)
3. **Pattern Learning** - SQLite-based pattern library
4. **Validation** - Multi-layer code quality checking
5. **Export Pipeline** - Complete project scaffolding
6. **MCP Integration** - 26 tools for Claude Code

The architecture is modular and can be adapted to generate web components, Flutter web, or PWA code instead of native Flutter.

