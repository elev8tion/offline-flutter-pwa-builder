/**
 * Testing Module Tools
 *
 * MCP tool definitions and handlers for test generation
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  TestingModuleConfig,
  // Note: Some types below are used for documentation but not runtime
  type TestType as _TestType,
  type CoverageLevel,
  type TestSuiteConfig as _TestSuiteConfig,
  type MockDefinition as _MockDefinition,
  toPascalCase,
  toSnakeCase,
  fileNameToClassName,
} from "./config.js";

// ============================================================================
// ZOD SCHEMAS FOR TOOL INPUTS
// ============================================================================

export const GenerateTestsInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  targetFile: z.string().describe("Path to the file to test (e.g., 'lib/features/todo/todo_repository.dart')"),
  testType: z.enum(["unit", "widget", "integration"]).describe("Type of tests to generate"),
  coverage: z.number().min(50).max(100).optional().describe("Target coverage percentage (default: 80)"),
});

export const GenerateMocksInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  classes: z.array(z.string()).describe("List of class names to mock"),
  outputFile: z.string().optional().describe("Output file path for mocks"),
});

export const ConfigureCoverageInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  minimumCoverage: z.union([z.literal(70), z.literal(80), z.literal(90), z.literal(100)])
    .describe("Minimum coverage percentage"),
  excludePatterns: z.array(z.string()).optional().describe("File patterns to exclude from coverage"),
  criticalPaths: z.array(z.string()).optional().describe("Critical paths requiring 100% coverage"),
});

export const GenerateWidgetTestInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  widgetFile: z.string().describe("Path to the widget file"),
  includeGolden: z.boolean().optional().describe("Generate golden tests"),
  includeAccessibility: z.boolean().optional().describe("Include accessibility tests"),
  includeResponsive: z.boolean().optional().describe("Include responsive layout tests"),
});

export const GenerateIntegrationTestInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  flowName: z.string().describe("Name of the user flow to test"),
  steps: z.array(z.object({
    action: z.enum(["tap", "enter_text", "scroll", "wait", "verify_text", "verify_widget", "navigate"]),
    target: z.string().describe("Target widget or text"),
    value: z.string().optional().describe("Value for enter_text action"),
    duration: z.number().optional().describe("Duration for wait action in ms"),
  })).describe("Test steps"),
});

export const RunTestsWithCoverageInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  testType: z.enum(["unit", "widget", "integration", "all"]).optional().describe("Type of tests to run"),
  generateReport: z.boolean().optional().describe("Generate HTML coverage report"),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const TESTING_TOOLS: Tool[] = [
  {
    name: "testing_generate_unit",
    description: "Generate unit tests for a Dart class with Mockito mocks, constructor tests, method tests, and edge cases",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        targetFile: { type: "string", description: "Path to file to test" },
        testType: { type: "string", enum: ["unit", "widget", "integration"], description: "Type of tests" },
        coverage: { type: "number", description: "Target coverage (50-100)", minimum: 50, maximum: 100 },
      },
      required: ["projectId", "targetFile", "testType"],
    },
  },
  {
    name: "testing_generate_widget",
    description: "Generate widget tests with rendering, interaction, accessibility, and responsive tests",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        widgetFile: { type: "string", description: "Path to widget file" },
        includeGolden: { type: "boolean", description: "Generate golden tests" },
        includeAccessibility: { type: "boolean", description: "Include accessibility tests" },
        includeResponsive: { type: "boolean", description: "Include responsive layout tests" },
      },
      required: ["projectId", "widgetFile"],
    },
  },
  {
    name: "testing_generate_integration",
    description: "Generate integration/e2e tests for user flows with navigation, interactions, and assertions",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        flowName: { type: "string", description: "Name of the user flow" },
        steps: {
          type: "array",
          description: "Test steps",
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["tap", "enter_text", "scroll", "wait", "verify_text", "verify_widget", "navigate"] },
              target: { type: "string", description: "Target widget or text" },
              value: { type: "string", description: "Value for enter_text" },
              duration: { type: "number", description: "Duration for wait (ms)" },
            },
            required: ["action", "target"],
          },
        },
      },
      required: ["projectId", "flowName", "steps"],
    },
  },
  {
    name: "testing_generate_mocks",
    description: "Generate Mockito mock classes for dependency injection and testing",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        classes: {
          type: "array",
          items: { type: "string" },
          description: "Classes to mock",
        },
        outputFile: { type: "string", description: "Output file path" },
      },
      required: ["projectId", "classes"],
    },
  },
  {
    name: "testing_configure_coverage",
    description: "Configure test coverage requirements and exclusions",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        minimumCoverage: { type: "number", enum: [70, 80, 90, 100], description: "Minimum coverage %" },
        excludePatterns: { type: "array", items: { type: "string" }, description: "Exclude patterns" },
        criticalPaths: { type: "array", items: { type: "string" }, description: "100% coverage paths" },
      },
      required: ["projectId", "minimumCoverage"],
    },
  },
  {
    name: "testing_run_with_coverage",
    description: "Run tests with coverage analysis and generate reports",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        testType: { type: "string", enum: ["unit", "widget", "integration", "all"], description: "Test type" },
        generateReport: { type: "boolean", description: "Generate HTML report" },
      },
      required: ["projectId"],
    },
  },
];

// ============================================================================
// TOOL CONTEXT
// ============================================================================

export interface TestingToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  updateProject: (id: string, updates: Partial<ProjectDefinition>) => Promise<ProjectDefinition>;
  getTestingConfig: (projectId: string) => TestingModuleConfig | undefined;
  updateTestingConfig: (projectId: string, config: Partial<TestingModuleConfig>) => void;
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handleTestingTool(
  name: string,
  args: Record<string, unknown>,
  ctx: TestingToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (name) {
    case "testing_generate_unit":
      return handleGenerateTests(args, ctx);
    case "testing_generate_widget":
      return handleGenerateWidgetTest(args, ctx);
    case "testing_generate_integration":
      return handleGenerateIntegrationTest(args, ctx);
    case "testing_generate_mocks":
      return handleGenerateMocks(args, ctx);
    case "testing_configure_coverage":
      return handleConfigureCoverage(args, ctx);
    case "testing_run_with_coverage":
      return handleRunTestsWithCoverage(args, ctx);
    default:
      throw new Error(`Unknown testing tool: ${name}`);
  }
}

// ============================================================================
// HANDLER IMPLEMENTATIONS
// ============================================================================

async function handleGenerateTests(
  args: Record<string, unknown>,
  ctx: TestingToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateTestsInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // Extract class name from file path
  const fileName = input.targetFile.split("/").pop() || "";
  const className = fileNameToClassName(fileName.replace(".dart", ""));
  const coverage = input.coverage || 80;

  let testCode = "";

  switch (input.testType) {
    case "unit":
      testCode = generateUnitTestCode(className, fileName, coverage);
      break;
    case "widget":
      testCode = generateWidgetTestCode(className, fileName);
      break;
    case "integration":
      testCode = generateIntegrationTestCode(className, fileName);
      break;
  }

  const testFileName = `${toSnakeCase(className)}_test.dart`;
  const testPath = input.testType === "integration"
    ? `integration_test/${testFileName}`
    : `test/${input.testType}/${testFileName}`;

  return {
    content: [
      {
        type: "text",
        text: `Generated ${input.testType} tests for ${className}

File: ${testPath}
Coverage Target: ${coverage}%

Test Structure:
- Constructor tests
- Method tests (sync/async)
- State management tests
- Edge cases (null, empty, boundary)
- Error handling tests
${input.testType === "widget" ? "- Accessibility tests\n- Responsive tests" : ""}
${input.testType === "integration" ? "- Performance measurement\n- Data persistence tests" : ""}

Generated Code:
\`\`\`dart
${testCode}
\`\`\`

To run tests:
\`\`\`bash
flutter test ${testPath}
\`\`\`

To run with coverage:
\`\`\`bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
\`\`\``,
      },
    ],
  };
}

async function handleGenerateWidgetTest(
  args: Record<string, unknown>,
  ctx: TestingToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateWidgetTestInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const fileName = input.widgetFile.split("/").pop() || "";
  const className = fileNameToClassName(fileName.replace(".dart", ""));

  const testCode = generateComprehensiveWidgetTestCode(
    className,
    fileName,
    input.includeGolden || false,
    input.includeAccessibility || false,
    input.includeResponsive || false
  );

  const testFileName = `${toSnakeCase(className)}_test.dart`;

  return {
    content: [
      {
        type: "text",
        text: `Generated widget tests for ${className}

File: test/widget/${testFileName}

Test Coverage:
- Rendering with default properties
- Display of provided text/data
- User interactions (tap, long press, etc.)
- State change handling
- Async operations
${input.includeAccessibility ? "- Accessibility (semantic labels, screen reader)" : ""}
${input.includeResponsive ? "- Responsive layouts (phone, tablet)" : ""}
${input.includeGolden ? "- Golden tests (visual regression)" : ""}

Generated Code:
\`\`\`dart
${testCode}
\`\`\`

${input.includeGolden ? `
To update golden files:
\`\`\`bash
flutter test --update-goldens
\`\`\`` : ""}`,
      },
    ],
  };
}

async function handleGenerateIntegrationTest(
  args: Record<string, unknown>,
  ctx: TestingToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateIntegrationTestInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const flowNamePascal = toPascalCase(input.flowName);
  const flowNameSnake = toSnakeCase(input.flowName);

  const testCode = generateIntegrationTestFromSteps(flowNamePascal, input.steps);

  return {
    content: [
      {
        type: "text",
        text: `Generated integration test for "${input.flowName}" flow

File: integration_test/${flowNameSnake}_test.dart

Steps:
${input.steps.map((s, i) => `${i + 1}. ${s.action}: ${s.target}${s.value ? ` = "${s.value}"` : ""}`).join("\n")}

Generated Code:
\`\`\`dart
${testCode}
\`\`\`

To run integration tests:
\`\`\`bash
flutter test integration_test/${flowNameSnake}_test.dart
\`\`\``,
      },
    ],
  };
}

async function handleGenerateMocks(
  args: Record<string, unknown>,
  ctx: TestingToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateMocksInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const mockCode = generateMockCode(input.classes);
  const outputFile = input.outputFile || "test/helpers/mocks.dart";

  return {
    content: [
      {
        type: "text",
        text: `Generated Mockito mocks for ${input.classes.length} classes

File: ${outputFile}

Classes:
${input.classes.map((c) => `- Mock${c}`).join("\n")}

Generated Code:
\`\`\`dart
${mockCode}
\`\`\`

To generate mock implementations:
\`\`\`bash
flutter pub run build_runner build --delete-conflicting-outputs
\`\`\`

Required dependencies (pubspec.yaml):
\`\`\`yaml
dev_dependencies:
  mockito: ^5.4.0
  build_runner: ^2.4.0
\`\`\``,
      },
    ],
  };
}

async function handleConfigureCoverage(
  args: Record<string, unknown>,
  ctx: TestingToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureCoverageInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getTestingConfig(input.projectId);

  ctx.updateTestingConfig(input.projectId, {
    ...config,
    defaultCoverage: input.minimumCoverage as CoverageLevel,
    coverageExclusions: input.excludePatterns || config?.coverageExclusions || [],
  });

  return {
    content: [
      {
        type: "text",
        text: `Coverage configured for project: ${project.name}

Settings:
- Minimum Coverage: ${input.minimumCoverage}%
- Critical Paths (100%): ${input.criticalPaths?.join(", ") || "None specified"}
- Excluded Patterns: ${input.excludePatterns?.join(", ") || "Default patterns"}

Generated lcov.yaml:
\`\`\`yaml
coverage:
  minimum: ${input.minimumCoverage}
  exclude:
${(input.excludePatterns || ["lib/**/*.g.dart", "lib/**/*.freezed.dart"]).map((p) => `    - "${p}"`).join("\n")}
${input.criticalPaths ? `  critical:
${input.criticalPaths.map((p) => `    - "${p}": 100`).join("\n")}` : ""}
\`\`\`

CI/CD Integration:
\`\`\`bash
# Run with coverage
flutter test --coverage

# Check coverage threshold
lcov --summary coverage/lcov.info | grep -E "lines.*: ([0-9]+)" | awk -F'[: %]+' '{if($3 < ${input.minimumCoverage}) exit 1}'
\`\`\``,
      },
    ],
  };
}

async function handleRunTestsWithCoverage(
  args: Record<string, unknown>,
  ctx: TestingToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = RunTestsWithCoverageInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const testType = input.testType || "all";

  return {
    content: [
      {
        type: "text",
        text: `Test execution commands for project: ${project.name}

Run ${testType} tests with coverage:

\`\`\`bash
# Run tests
${testType === "all" || testType === "unit" ? "flutter test test/unit/ --coverage" : ""}
${testType === "all" || testType === "widget" ? "flutter test test/widget/ --coverage" : ""}
${testType === "all" || testType === "integration" ? "flutter test integration_test/ --coverage" : ""}

# Combine coverage (if running multiple types)
lcov --add-tracefile coverage/lcov.info -o coverage/combined.info

${input.generateReport ? `# Generate HTML report
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html` : ""}

# View coverage summary
lcov --summary coverage/lcov.info
\`\`\`

Expected output structure:
\`\`\`
coverage/
  lcov.info           # Raw coverage data
  ${input.generateReport ? `html/
    index.html        # Coverage report
    *.dart.gcov.html  # Per-file reports` : ""}
\`\`\``,
      },
    ],
  };
}

// ============================================================================
// CODE GENERATION HELPERS
// ============================================================================

function generateUnitTestCode(className: string, fileName: string, _coverage: number): string {
  return `import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:your_app/${fileName}';

// Generate mocks using: flutter pub run build_runner build
@GenerateMocks([
  // Add classes to mock here
])
void main() {
  group('${className} Unit Tests', () {
    late ${className} sut; // System Under Test

    setUp(() {
      // Initialize the class and mocks
      sut = ${className}();
    });

    tearDown(() {
      // Clean up after each test
    });

    group('Constructor', () {
      test('should create instance with default values', () {
        // Arrange & Act
        final instance = ${className}();

        // Assert
        expect(instance, isNotNull);
        expect(instance, isA<${className}>());
      });

      test('should create instance with custom values', () {
        // Arrange
        // Add custom parameters

        // Act
        final instance = ${className}(/* parameters */);

        // Assert
        expect(instance, isNotNull);
        // Add more assertions
      });
    });

    group('Methods', () {
      test('method should return expected value', () {
        // Arrange
        const expected = /* expected value */;

        // Act
        final result = sut.methodName();

        // Assert
        expect(result, equals(expected));
      });

      test('async method should complete successfully', () async {
        // Arrange
        const expected = /* expected value */;

        // Act
        final result = await sut.asyncMethod();

        // Assert
        expect(result, equals(expected));
      });

      test('should throw exception on invalid input', () {
        // Arrange
        const invalidInput = /* invalid input */;

        // Act & Assert
        expect(
          () => sut.methodWithValidation(invalidInput),
          throwsA(isA<ArgumentError>()),
        );
      });
    });

    group('State Management', () {
      test('should update state correctly', () {
        // Arrange
        const newValue = /* new value */;

        // Act
        sut.updateState(newValue);

        // Assert
        expect(sut.state, equals(newValue));
      });

      test('should notify listeners on state change', () {
        // Arrange
        var notified = false;
        sut.addListener(() => notified = true);

        // Act
        sut.updateState(/* new value */);

        // Assert
        expect(notified, isTrue);
      });
    });

    group('Edge Cases', () {
      test('should handle null values gracefully', () {
        // Arrange
        const nullValue = null;

        // Act
        final result = sut.handleNullable(nullValue);

        // Assert
        expect(result, isNotNull);
      });

      test('should handle empty collections', () {
        // Arrange
        final emptyList = <String>[];

        // Act
        final result = sut.processCollection(emptyList);

        // Assert
        expect(result, isEmpty);
      });

      test('should handle boundary values', () {
        // Arrange
        const maxValue = /* max value */;
        const minValue = /* min value */;

        // Act & Assert
        expect(() => sut.processValue(maxValue), returnsNormally);
        expect(() => sut.processValue(minValue), returnsNormally);
      });
    });

    group('Error Handling', () {
      test('should handle network errors', () async {
        // Arrange
        // Mock network failure

        // Act & Assert
        expect(
          () async => await sut.fetchData(),
          throwsA(isA<NetworkException>()),
        );
      });

      test('should recover from errors gracefully', () async {
        // Arrange
        // First call fails, second succeeds

        // Act
        final result = await sut.fetchWithRetry();

        // Assert
        expect(result, isNotNull);
      });
    });
  });

  // Performance tests
  group('Performance Tests', () {
    test('should complete operation within time limit', () {
      // Arrange
      final stopwatch = Stopwatch()..start();

      // Act
      sut.performOperation();
      stopwatch.stop();

      // Assert
      expect(stopwatch.elapsedMilliseconds, lessThan(100));
    });
  });
}`;
}

function generateWidgetTestCode(className: string, fileName: string): string {
  return `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:your_app/${fileName}';

void main() {
  group('${className} Widget Tests', () {
    testWidgets('should render correctly with default properties', (tester) async {
      // Arrange & Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ${className}(),
          ),
        ),
      );

      // Assert
      expect(find.byType(${className}), findsOneWidget);
    });

    testWidgets('should display provided text', (tester) async {
      // Arrange
      const testText = 'Test Text';

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ${className}(
              text: testText,
            ),
          ),
        ),
      );

      // Assert
      expect(find.text(testText), findsOneWidget);
    });

    testWidgets('should handle user interactions', (tester) async {
      // Arrange
      var tapCount = 0;

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ${className}(
              onTap: () => tapCount++,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(${className}));
      await tester.pump();

      // Assert
      expect(tapCount, equals(1));
    });

    testWidgets('should update UI on state change', (tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ${className}(
              initialValue: 0,
            ),
          ),
        ),
      );

      // Act - trigger state change
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();

      // Assert
      expect(find.text('1'), findsOneWidget);
    });

    testWidgets('should handle async operations', (tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ${className}(
              loadData: true,
            ),
          ),
        ),
      );

      // Assert - loading state
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Act - wait for async operation
      await tester.pumpAndSettle();

      // Assert - loaded state
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });
}`;
}

function generateIntegrationTestCode(className: string, _fileName: string): string {
  return `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:your_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('${className} Integration Tests', () {
    testWidgets('full user flow test', (tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      // Navigate to the screen
      await tester.tap(find.byIcon(Icons.menu));
      await tester.pumpAndSettle();

      await tester.tap(find.text('${className} Screen'));
      await tester.pumpAndSettle();

      // Verify the widget is displayed
      expect(find.byType(${className}), findsOneWidget);

      // Test user interaction flow
      await tester.enterText(
        find.byType(TextField).first,
        'Test Input',
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();

      // Verify result
      expect(find.text('Success'), findsOneWidget);
    });

    testWidgets('error handling flow', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Navigate and trigger error
      await tester.tap(find.text('${className} Screen'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, 'invalid_input');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();

      // Verify error handling
      expect(find.text('Error'), findsOneWidget);
    });
  });
}`;
}

function generateComprehensiveWidgetTestCode(
  className: string,
  fileName: string,
  includeGolden: boolean,
  includeAccessibility: boolean,
  includeResponsive: boolean
): string {
  let code = generateWidgetTestCode(className, fileName);

  if (includeAccessibility) {
    code += `

    testWidgets('should be accessible', (tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ${className}(
              semanticLabel: 'Accessible Widget',
            ),
          ),
        ),
      );

      // Act
      final semantics = tester.getSemantics(find.byType(${className}));

      // Assert
      expect(semantics.label, contains('Accessible Widget'));
    });`;
  }

  if (includeResponsive) {
    code += `

    testWidgets('should handle different screen sizes', (tester) async {
      // Test on phone size
      await tester.binding.setSurfaceSize(const Size(375, 812));
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ${className}(),
          ),
        ),
      );
      expect(find.byType(${className}), findsOneWidget);

      // Test on tablet size
      await tester.binding.setSurfaceSize(const Size(768, 1024));
      await tester.pumpAndSettle();
      expect(find.byType(${className}), findsOneWidget);
    });`;
  }

  if (includeGolden) {
    code = code.replace(
      "import 'package:flutter_test/flutter_test.dart';",
      `import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';`
    );

    code += `

    group('Golden Tests', () {
      testGoldens('should match golden file', (tester) async {
        await tester.pumpWidgetBuilder(
          ${className}(),
          wrapper: (child) => MaterialApp(
            home: Scaffold(body: child),
          ),
        );

        await screenMatchesGolden(tester, '${toSnakeCase(className)}_default');
      });

      testGoldens('should match golden file in dark mode', (tester) async {
        await tester.pumpWidgetBuilder(
          ${className}(),
          wrapper: (child) => MaterialApp(
            theme: ThemeData.dark(),
            home: Scaffold(body: child),
          ),
        );

        await screenMatchesGolden(tester, '${toSnakeCase(className)}_dark');
      });
    });`;
  }

  // Close the main group
  code += `
  });
}`;

  return code;
}

function generateIntegrationTestFromSteps(
  flowName: string,
  steps: Array<{
    action: string;
    target: string;
    value?: string;
    duration?: number;
  }>
): string {
  const stepsCode = steps
    .map((step) => {
      switch (step.action) {
        case "tap":
          return `      await tester.tap(find.text('${step.target}'));
      await tester.pumpAndSettle();`;
        case "enter_text":
          return `      await tester.enterText(find.byType(TextField), '${step.value || ""}');
      await tester.pumpAndSettle();`;
        case "scroll":
          return `      await tester.drag(find.byType(ListView), const Offset(0, -300));
      await tester.pumpAndSettle();`;
        case "wait":
          return `      await tester.pump(Duration(milliseconds: ${step.duration || 1000}));`;
        case "verify_text":
          return `      expect(find.text('${step.target}'), findsOneWidget);`;
        case "verify_widget":
          return `      expect(find.byType(${step.target}), findsOneWidget);`;
        case "navigate":
          return `      await tester.tap(find.text('${step.target}'));
      await tester.pumpAndSettle();`;
        default:
          return `      // Unknown action: ${step.action}`;
      }
    })
    .join("\n\n");

  return `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:your_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('${flowName} Flow Tests', () {
    testWidgets('should complete ${flowName.toLowerCase()} flow', (tester) async {
      // Launch the app
      app.main();
      await tester.pumpAndSettle();

      // Execute test steps
${stepsCode}
    });
  });
}`;
}

function generateMockCode(classes: string[]): string {
  const mockAnnotations = classes.map((c) => c).join(", ");
  const imports = classes
    .map((c) => `// import 'package:your_app/path/to/${toSnakeCase(c)}.dart';`)
    .join("\n");

  return `import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

// Import your classes
${imports}

// Generate mocks using: flutter pub run build_runner build
@GenerateMocks([${mockAnnotations}])
void main() {}

// After running build_runner, import the generated file:
// import 'mocks.mocks.dart';

// Usage example:
// final mock${classes[0]} = Mock${classes[0]}();
// when(mock${classes[0]}.someMethod()).thenReturn(expectedValue);
// verify(mock${classes[0]}.someMethod()).called(1);
`;
}

export default TESTING_TOOLS;
