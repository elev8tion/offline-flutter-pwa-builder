/**
 * Testing Module Hooks
 *
 * Lifecycle hooks for the Testing module
 */

import type {
  HookContext,
  GeneratedFile,
  ModuleHooks,
} from "../../core/types.js";
import {
  TestingModuleConfig,
  DEFAULT_TESTING_CONFIG,
  toPascalCase,
  toSnakeCase,
} from "./config.js";

// ============================================================================
// HANDLEBARS HELPERS FOR TESTING TEMPLATES
// ============================================================================

export function registerTestingHelpers(handlebars: typeof import("handlebars")): void {
  // Convert to test file name
  handlebars.registerHelper("testFileName", (fileName: string) => {
    const name = fileName.replace(".dart", "");
    return `${toSnakeCase(name)}_test.dart`;
  });

  // Convert to mock class name
  handlebars.registerHelper("mockClassName", (className: string) => {
    return `Mock${toPascalCase(className)}`;
  });

  // Generate test group name
  handlebars.registerHelper("testGroupName", (className: string) => {
    return `${toPascalCase(className)} Tests`;
  });

  // Generate import path for test
  handlebars.registerHelper("testImportPath", (filePath: string) => {
    return filePath.replace("lib/", "package:your_app/");
  });
}

// ============================================================================
// MODULE HOOKS IMPLEMENTATION
// ============================================================================

/**
 * Get testing config from project modules
 */
function getTestingConfig(ctx: HookContext): TestingModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "testing");
  return {
    ...DEFAULT_TESTING_CONFIG,
    ...(moduleConfig?.config as Partial<TestingModuleConfig> ?? {}),
  };
}

export const testingHooks: ModuleHooks = {
  /**
   * Called when the module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getTestingConfig(ctx);
    console.log(`[Testing] Module installed with coverage target: ${config.defaultCoverage}%`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getTestingConfig(ctx);

    // Validate config
    if (config.defaultCoverage < 50 || config.defaultCoverage > 100) {
      throw new Error("[Testing] Coverage must be between 50% and 100%");
    }

    console.log(`[Testing] Generating tests with ${config.suites.length} test suites`);
  },

  /**
   * Main code generation hook
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getTestingConfig(ctx);
    const files: GeneratedFile[] = [];

    // 1. Generate test helper files
    files.push(generateTestHelpersFile(config));

    // 2. Generate mock configuration file
    if (config.generateMocks && config.useMockito) {
      files.push(generateMockConfigFile(config));
    }

    // 3. Generate test runner configuration
    files.push(generateFlutterTestConfig(config));

    // 4. Generate coverage configuration
    files.push(generateCoverageConfig(config));

    // 5. Generate test suite files for each registered suite
    for (const suite of config.suites) {
      files.push(generateTestSuiteFile(config, suite));
    }

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getTestingConfig(ctx);

    console.log(`[Testing] Generated ${config.suites.length} test suites`);
    console.log(`[Testing] Run 'flutter test --coverage' to run tests with coverage`);
  },

  /**
   * Called before build
   */
  beforeBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Testing] Running tests before build...");
  },

  /**
   * Called after build
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Testing] Tests completed");
  },
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function generateTestHelpersFile(config: TestingModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Test Helpers

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Wraps a widget with MaterialApp for testing
Widget wrapWithMaterialApp(Widget child, {ThemeData? theme}) {
  return MaterialApp(
    theme: theme ?? ThemeData.light(),
    home: Scaffold(body: child),
  );
}

/// Wraps a widget with required providers for testing
Widget wrapWithProviders(Widget child, {List<Override>? overrides}) {
  // Add your provider setup here
  return wrapWithMaterialApp(child);
}

/// Creates a test key for finding widgets
Key testKey(String name) => Key('test_\$name');

/// Finds a widget by test key
Finder findByTestKey(String name) => find.byKey(testKey(name));

/// Pumps widget and settles with timeout
Future<void> pumpAndSettleWithTimeout(
  WidgetTester tester, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  await tester.pumpAndSettle(
    const Duration(milliseconds: 100),
    EnginePhase.sendSemanticsUpdate,
    timeout,
  );
}

/// Enters text into a text field and pumps
Future<void> enterTextAndPump(
  WidgetTester tester,
  Finder finder,
  String text,
) async {
  await tester.enterText(finder, text);
  await tester.pump();
}

/// Taps widget and waits for animations
Future<void> tapAndSettle(WidgetTester tester, Finder finder) async {
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

/// Scrolls until widget is visible
Future<void> scrollUntilVisible(
  WidgetTester tester,
  Finder finder, {
  Finder? scrollable,
  double delta = 100,
}) async {
  await tester.scrollUntilVisible(
    finder,
    delta,
    scrollable: scrollable,
  );
}

/// Tests widget on multiple screen sizes
Future<void> testOnMultipleScreenSizes(
  WidgetTester tester,
  Widget widget,
  Future<void> Function(Size size) test,
) async {
  final sizes = [
    const Size(320, 568),  // iPhone SE
    const Size(375, 812),  // iPhone X
    const Size(414, 896),  // iPhone 11 Pro Max
    const Size(768, 1024), // iPad
    const Size(1024, 1366), // iPad Pro
  ];

  for (final size in sizes) {
    await tester.binding.setSurfaceSize(size);
    await tester.pumpWidget(wrapWithMaterialApp(widget));
    await test(size);
  }
}

/// Mock network image for tests
class MockNetworkImage extends StatelessWidget {
  final String url;
  final double? width;
  final double? height;
  final BoxFit? fit;

  const MockNetworkImage({
    Key? key,
    required this.url,
    this.width,
    this.height,
    this.fit,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      color: Colors.grey,
      child: const Icon(Icons.image),
    );
  }
}

/// Extension for common test patterns
extension WidgetTesterExtensions on WidgetTester {
  /// Pumps widget wrapped in MaterialApp
  Future<void> pumpMaterialWidget(Widget widget) async {
    await pumpWidget(wrapWithMaterialApp(widget));
  }

  /// Finds and taps a button by text
  Future<void> tapButton(String text) async {
    await tap(find.text(text));
    await pumpAndSettle();
  }

  /// Enters text in a labeled field
  Future<void> enterInField(String label, String text) async {
    final field = find.widgetWithText(TextField, label);
    await enterText(field, text);
    await pump();
  }
}

/// Test data generators
class TestData {
  static String randomString([int length = 10]) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return List.generate(
      length,
      (i) => chars[DateTime.now().microsecond % chars.length],
    ).join();
  }

  static int randomInt([int max = 1000]) {
    return DateTime.now().microsecond % max;
  }

  static String randomEmail() {
    return '\${randomString(8)}@test.com';
  }

  static DateTime randomDate() {
    return DateTime.now().subtract(Duration(days: randomInt(365)));
  }
}
`;

  return {
    path: `${config.testDirectory}/helpers/test_helpers.dart`,
    content,
  };
}

function generateMockConfigFile(config: TestingModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Mock Configuration

import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

// Add your imports here
// import 'package:your_app/services/api_service.dart';
// import 'package:your_app/repositories/user_repository.dart';

// Generate mocks using: flutter pub run build_runner build
@GenerateMocks([
  // Add classes to mock here
  // ApiService,
  // UserRepository,
])
void main() {}

// After running build_runner, this file will have a companion:
// mock_config.mocks.dart
//
// Usage:
// final mockApiService = MockApiService();
// when(mockApiService.fetchData()).thenAnswer((_) async => mockData);
// verify(mockApiService.fetchData()).called(1);
`;

  return {
    path: `${config.testDirectory}/helpers/mock_config.dart`,
    content,
  };
}

function generateFlutterTestConfig(_config: TestingModuleConfig): GeneratedFile {
  const content = `# flutter_test.yaml
# Test configuration for Flutter

test:
  # Test directories
  directories:
    - test/unit
    - test/widget
    - test/golden

  # Excluded patterns
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - "**/mock_*.dart"

  # Parallelization
  concurrency: 4

  # Timeout for individual tests
  timeout: 30s

  # Reporter
  reporter: expanded

  # Platform
  platforms:
    - vm
    - chrome
`;

  return {
    path: "flutter_test.yaml",
    content,
  };
}

function generateCoverageConfig(config: TestingModuleConfig): GeneratedFile {
  const exclusions = config.coverageExclusions.map((e) => `    - "${e}"`).join("\n");

  const content = `# lcov.yaml
# Coverage configuration

coverage:
  # Minimum coverage threshold
  minimum: ${config.defaultCoverage}

  # Excluded files/patterns
  exclude:
${exclusions}
    - "lib/generated/**"
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - "**/main.dart"
    - "**/firebase_options.dart"

  # Critical paths requiring 100% coverage
  critical:
    - "lib/core/**": 90
    - "lib/services/**": 85
    - "lib/repositories/**": 85

  # Report formats
  formats:
    - lcov
    - html
    - json

# CI/CD integration
ci:
  fail_below_threshold: true
  upload_to_codecov: false
  upload_to_coveralls: false
`;

  return {
    path: "lcov.yaml",
    content,
  };
}

function generateTestSuiteFile(config: TestingModuleConfig, suite: any): GeneratedFile {
  const className = toPascalCase(suite.className);
  const fileName = toSnakeCase(suite.className);

  let testPath: string;
  switch (suite.testType) {
    case "unit":
      testPath = `${config.testDirectory}/unit/${fileName}_test.dart`;
      break;
    case "widget":
      testPath = `${config.testDirectory}/widget/${fileName}_test.dart`;
      break;
    case "integration":
      testPath = `${config.integrationTestDirectory}/${fileName}_test.dart`;
      break;
    case "golden":
      testPath = `${config.goldenDirectory}/${fileName}_test.dart`;
      break;
    default:
      testPath = `${config.testDirectory}/${fileName}_test.dart`;
  }

  const mockImports = suite.mocks?.length > 0
    ? suite.mocks.map((m: any) => `// Mock${m.className}`).join("\n")
    : "";

  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Test Suite: ${className}
// Type: ${suite.testType}

import 'package:flutter_test/flutter_test.dart';
${suite.testType === "widget" || suite.testType === "golden" ? "import 'package:flutter/material.dart';" : ""}
${config.useMockito ? "import 'package:mockito/mockito.dart';" : ""}
import 'package:your_app/${suite.targetFile}';

${mockImports}

void main() {
  group('${className} ${suite.testType} Tests', () {
    ${suite.setupCode || `setUp(() {
      // Test setup
    });`}

    ${suite.teardownCode || `tearDown(() {
      // Test cleanup
    });`}

    ${generateTestMethods(suite)}
  });
}
`;

  return {
    path: testPath,
    content,
  };
}

function generateTestMethods(suite: any): string {
  if (!suite.methods || suite.methods.length === 0) {
    return `test('should be implemented', () {
      // TODO: Implement tests for ${suite.className}
      expect(true, isTrue);
    });`;
  }

  return suite.methods
    .map((method: any) => {
      const testName = method.description || `should ${method.name}`;
      const asyncKeyword = method.async ? "async " : "";

      let expectation = "";
      switch (method.expectationType) {
        case "equals":
          expectation = `expect(result, equals(${JSON.stringify(method.expectedValue)}));`;
          break;
        case "throws":
          expectation = `expect(() => sut.${method.name}(), throwsException);`;
          break;
        case "notNull":
          expectation = "expect(result, isNotNull);";
          break;
        case "isEmpty":
          expectation = "expect(result, isEmpty);";
          break;
        case "isTrue":
          expectation = "expect(result, isTrue);";
          break;
        case "isFalse":
          expectation = "expect(result, isFalse);";
          break;
        case "contains":
          expectation = `expect(result, contains(${JSON.stringify(method.expectedValue)}));`;
          break;
        default:
          expectation = "expect(result, isNotNull);";
      }

      return `test('${testName}', ${asyncKeyword}() ${asyncKeyword ? "async " : ""}{
      // Arrange
      // TODO: Set up test data

      // Act
      final result = ${method.async ? "await " : ""}sut.${method.name}();

      // Assert
      ${expectation}
    });`;
    })
    .join("\n\n    ");
}

export default testingHooks;
