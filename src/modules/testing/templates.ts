/**
 * Testing Module Templates
 *
 * Handlebars templates for test generation
 */

import type { Template } from "../../core/types.js";

// ============================================================================
// RAW TEMPLATE STRINGS
// ============================================================================

const UNIT_TEST_SOURCE = `import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:{{packageName}}/{{targetPath}}';

{{#if mocks}}
@GenerateMocks([{{#each mocks}}{{className}}{{#unless @last}}, {{/unless}}{{/each}}])
{{/if}}
void main() {
  group('{{className}} Unit Tests', () {
    late {{className}} sut;
    {{#each mocks}}
    late Mock{{className}} mock{{className}};
    {{/each}}

    setUp(() {
      {{#each mocks}}
      mock{{className}} = Mock{{className}}();
      {{/each}}
      sut = {{className}}(
        {{#each mocks}}
        {{camelCase className}}: mock{{className}},
        {{/each}}
      );
    });

    tearDown(() {
      // Clean up
    });

    group('Constructor', () {
      test('should create instance', () {
        expect(sut, isNotNull);
        expect(sut, isA<{{className}}>());
      });
    });

    {{#each methods}}
    group('{{name}}', () {
      test('should {{description}}', {{#if async}}async {{/if}}() {{#if async}}async {{/if}}{
        // Arrange
        {{#if arrangeCode}}
        {{arrangeCode}}
        {{/if}}

        // Act
        final result = {{#if async}}await {{/if}}sut.{{name}}();

        // Assert
        {{#if assertCode}}
        {{assertCode}}
        {{else}}
        expect(result, isNotNull);
        {{/if}}
      });
    });
    {{/each}}
  });
}
`;

const WIDGET_TEST_SOURCE = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
{{#if includeGolden}}
import 'package:golden_toolkit/golden_toolkit.dart';
{{/if}}
import 'package:{{packageName}}/{{targetPath}}';

void main() {
  {{#if includeGolden}}
  setUpAll(() async {
    await loadAppFonts();
  });
  {{/if}}

  group('{{className}} Widget Tests', () {
    testWidgets('should render correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: {{className}}(),
          ),
        ),
      );

      expect(find.byType({{className}}), findsOneWidget);
    });

    {{#if hasText}}
    testWidgets('should display text', (tester) async {
      const testText = 'Test';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: {{className}}(text: testText),
          ),
        ),
      );

      expect(find.text(testText), findsOneWidget);
    });
    {{/if}}

    {{#if hasOnTap}}
    testWidgets('should handle tap', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: {{className}}(onTap: () => tapped = true),
          ),
        ),
      );

      await tester.tap(find.byType({{className}}));
      await tester.pump();

      expect(tapped, isTrue);
    });
    {{/if}}

    {{#if includeAccessibility}}
    testWidgets('should be accessible', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: {{className}}(
              semanticLabel: '{{className}} widget',
            ),
          ),
        ),
      );

      final semantics = tester.getSemantics(find.byType({{className}}));
      expect(semantics.label, isNotEmpty);
    });
    {{/if}}

    {{#if includeResponsive}}
    testWidgets('should handle different sizes', (tester) async {
      // Phone
      await tester.binding.setSurfaceSize(const Size(375, 812));
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: {{className}}())),
      );
      expect(find.byType({{className}}), findsOneWidget);

      // Tablet
      await tester.binding.setSurfaceSize(const Size(768, 1024));
      await tester.pumpAndSettle();
      expect(find.byType({{className}}), findsOneWidget);
    });
    {{/if}}

    {{#if includeGolden}}
    group('Golden Tests', () {
      testGoldens('default state', (tester) async {
        await tester.pumpWidgetBuilder(
          {{className}}(),
          wrapper: (child) => MaterialApp(
            home: Scaffold(body: child),
          ),
        );

        await screenMatchesGolden(tester, '{{snakeCase className}}_default');
      });
    });
    {{/if}}
  });
}
`;

const INTEGRATION_TEST_SOURCE = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:{{packageName}}/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('{{flowName}} Flow', () {
    testWidgets('complete flow', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      {{#each steps}}
      // Step {{@index}}: {{description}}
      {{#if (eq action "tap")}}
      await tester.tap(find.{{targetType}}('{{target}}'));
      await tester.pumpAndSettle();
      {{/if}}
      {{#if (eq action "enterText")}}
      await tester.enterText(find.byType(TextField), '{{value}}');
      await tester.pumpAndSettle();
      {{/if}}
      {{#if (eq action "scroll")}}
      await tester.drag(find.byType(ListView), const Offset(0, -{{scrollAmount}}));
      await tester.pumpAndSettle();
      {{/if}}
      {{#if (eq action "wait")}}
      await tester.pump(Duration(milliseconds: {{duration}}));
      {{/if}}
      {{#if (eq action "verify")}}
      expect(find.{{targetType}}('{{target}}'), findsOneWidget);
      {{/if}}

      {{/each}}
    });

    testWidgets('error handling', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Test error scenario
      {{#if errorScenario}}
      {{errorScenario}}
      {{else}}
      // TODO: Add error handling test
      {{/if}}
    });
  });
}
`;

const MOCK_FILE_SOURCE = `import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

{{#each imports}}
import '{{this}}';
{{/each}}

@GenerateMocks([
  {{#each classes}}
  {{this}},
  {{/each}}
])
void main() {}

// Generated mocks available after running:
// flutter pub run build_runner build
`;

const HELPERS_SOURCE = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Wrap widget with MaterialApp
Widget wrapWithMaterialApp(Widget child, {ThemeData? theme}) {
  return MaterialApp(
    theme: theme ?? ThemeData.light(),
    home: Scaffold(body: child),
  );
}

/// Create test key
Key testKey(String name) => Key('test_\$name');

/// Find by test key
Finder findByTestKey(String name) => find.byKey(testKey(name));

/// Pump and settle with timeout
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

/// Enter text and pump
Future<void> enterTextAndPump(
  WidgetTester tester,
  Finder finder,
  String text,
) async {
  await tester.enterText(finder, text);
  await tester.pump();
}

/// Tap and settle
Future<void> tapAndSettle(WidgetTester tester, Finder finder) async {
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

/// Test on multiple screen sizes
Future<void> testOnMultipleScreenSizes(
  WidgetTester tester,
  Widget widget,
  Future<void> Function(Size size) test,
) async {
  final sizes = [
    const Size(375, 812),  // iPhone
    const Size(768, 1024), // iPad
  ];

  for (final size in sizes) {
    await tester.binding.setSurfaceSize(size);
    await tester.pumpWidget(wrapWithMaterialApp(widget));
    await test(size);
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
}
`;

const PUBSPEC_ADDITIONS_SOURCE = `# Add these to your pubspec.yaml dev_dependencies

dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
  mockito: ^5.4.0
  build_runner: ^2.4.0
  {{#if includeGolden}}
  golden_toolkit: ^0.15.0
  {{/if}}
  {{#if includeBloc}}
  bloc_test: ^9.1.0
  {{/if}}
  {{#if includeRiverpod}}
  riverpod: ^2.4.0
  {{/if}}
`;

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const TESTING_TEMPLATES: Template[] = [
  {
    id: "testing-unit-test",
    name: "Unit Test",
    description: "Unit test template with Mockito mocks",
    type: "file",
    source: UNIT_TEST_SOURCE,
    output: {
      path: "test/unit",
      filename: "{{snakeCase className}}_test",
      extension: "dart",
    },
  },
  {
    id: "testing-widget-test",
    name: "Widget Test",
    description: "Widget test template with interaction and rendering tests",
    type: "file",
    source: WIDGET_TEST_SOURCE,
    output: {
      path: "test/widget",
      filename: "{{snakeCase className}}_test",
      extension: "dart",
    },
  },
  {
    id: "testing-integration-test",
    name: "Integration Test",
    description: "Integration test template for user flows",
    type: "file",
    source: INTEGRATION_TEST_SOURCE,
    output: {
      path: "integration_test",
      filename: "{{snakeCase flowName}}_test",
      extension: "dart",
    },
  },
  {
    id: "testing-mock-file",
    name: "Mock Configuration",
    description: "Mockito mock configuration file",
    type: "file",
    source: MOCK_FILE_SOURCE,
    output: {
      path: "test/helpers",
      filename: "mocks",
      extension: "dart",
    },
  },
  {
    id: "testing-helpers",
    name: "Test Helpers",
    description: "Common test helper functions",
    type: "file",
    source: HELPERS_SOURCE,
    output: {
      path: "test/helpers",
      filename: "test_helpers",
      extension: "dart",
    },
  },
  {
    id: "testing-pubspec-additions",
    name: "Pubspec Test Dependencies",
    description: "Required dev dependencies for testing",
    type: "file",
    source: PUBSPEC_ADDITIONS_SOURCE,
    output: {
      path: ".",
      filename: "pubspec_testing_additions",
      extension: "yaml",
    },
  },
];

export default TESTING_TEMPLATES;
