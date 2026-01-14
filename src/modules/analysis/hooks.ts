/**
 * Analysis Module Hooks
 *
 * Lifecycle hooks for the Analysis module
 */

import type {
  HookContext,
  GeneratedFile,
  ModuleHooks,
} from "../../core/types.js";
import {
  AnalysisModuleConfig,
  DEFAULT_ANALYSIS_CONFIG,
} from "./config.js";

// ============================================================================
// HANDLEBARS HELPERS FOR ANALYSIS TEMPLATES
// ============================================================================

export function registerAnalysisHelpers(handlebars: typeof import("handlebars")): void {
  // Format severity
  handlebars.registerHelper("severityIcon", (severity: string) => {
    const icons: Record<string, string> = {
      info: "i",
      warning: "!",
      error: "x",
      critical: "!!",
    };
    return icons[severity] || "?";
  });

  // Format percentage
  handlebars.registerHelper("percentage", (value: number) => {
    return `${Math.round(value * 100)}%`;
  });
}

// ============================================================================
// MODULE HOOKS IMPLEMENTATION
// ============================================================================

/**
 * Get analysis config from project modules
 */
function getAnalysisConfig(ctx: HookContext): AnalysisModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "analysis");
  return {
    ...DEFAULT_ANALYSIS_CONFIG,
    ...(moduleConfig?.config as Partial<AnalysisModuleConfig> ?? {}),
  };
}

export const analysisHooks: ModuleHooks = {
  /**
   * Called when the module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getAnalysisConfig(ctx);
    console.log(`[Analysis] Module installed`);
    console.log(`[Analysis] Default level: ${config.defaultLevel}`);
    console.log(`[Analysis] Auto-fix enabled: ${config.enableAutoFix}`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (_ctx: HookContext): Promise<void> => {
    console.log("[Analysis] Preparing analysis tools...");
  },

  /**
   * Main code generation hook
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getAnalysisConfig(ctx);
    const files: GeneratedFile[] = [];

    // 1. Generate analysis options file
    files.push(generateAnalysisOptions(config));

    // 2. Generate code metrics helper
    files.push(generateMetricsHelper());

    // 3. Generate lint rules
    files.push(generateLintRules(config));

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (_ctx: HookContext): Promise<void> => {
    console.log("[Analysis] Generated analysis configuration files");
  },

  /**
   * Called before build
   */
  beforeBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Analysis] Running pre-build analysis checks...");
  },

  /**
   * Called after build
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Analysis] Build analysis completed");
  },
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function generateAnalysisOptions(_config: AnalysisModuleConfig): GeneratedFile {
  const content = `# GENERATED CODE - DO NOT MODIFY BY HAND
# Analysis options for Flutter project

include: package:flutter_lints/flutter.yaml

analyzer:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - "**/*.gen.dart"
    - ".dart_tool/**"
    - "build/**"
  strong-mode:
    implicit-casts: false
    implicit-dynamic: false
  errors:
    missing_return: error
    missing_required_param: error
    dead_code: warning
    unused_import: warning
    unused_local_variable: warning
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true

linter:
  rules:
    # Error rules
    - always_use_package_imports
    - avoid_dynamic_calls
    - avoid_empty_else
    - avoid_print
    - avoid_relative_lib_imports
    - avoid_returning_null_for_future
    - avoid_slow_async_io
    - avoid_type_to_string
    - avoid_types_as_parameter_names
    - avoid_web_libraries_in_flutter
    - cancel_subscriptions
    - close_sinks
    - comment_references
    - literal_only_boolean_expressions
    - no_adjacent_strings_in_list
    - no_duplicate_case_values
    - prefer_void_to_null
    - throw_in_finally
    - unnecessary_statements
    - unrelated_type_equality_checks
    - valid_regexps

    # Style rules
    - always_declare_return_types
    - always_require_non_null_named_parameters
    - annotate_overrides
    - avoid_annotating_with_dynamic
    - avoid_bool_literals_in_conditional_expressions
    - avoid_catches_without_on_clauses
    - avoid_catching_errors
    - avoid_double_and_int_checks
    - avoid_equals_and_hash_code_on_mutable_classes
    - avoid_escaping_inner_quotes
    - avoid_field_initializers_in_const_classes
    - avoid_final_parameters
    - avoid_function_literals_in_foreach_calls
    - avoid_implementing_value_types
    - avoid_init_to_null
    - avoid_multiple_declarations_per_line
    - avoid_null_checks_in_equality_operators
    - avoid_positional_boolean_parameters
    - avoid_private_typedef_functions
    - avoid_redundant_argument_values
    - avoid_renaming_method_parameters
    - avoid_return_types_on_setters
    - avoid_returning_null
    - avoid_returning_null_for_void
    - avoid_returning_this
    - avoid_setters_without_getters
    - avoid_shadowing_type_parameters
    - avoid_single_cascade_in_expression_statements
    - avoid_unnecessary_containers
    - avoid_unused_constructor_parameters
    - avoid_void_async
    - cascade_invocations
    - cast_nullable_to_non_nullable
    - combinators_ordering
    - conditional_uri_does_not_exist
    - constant_identifier_names
    - curly_braces_in_flow_control_structures
    - deprecated_consistency
    - directives_ordering
    - do_not_use_environment
    - empty_catches
    - empty_constructor_bodies
    - eol_at_end_of_file
    - exhaustive_cases
    - file_names
    - flutter_style_todos
    - implementation_imports
    - join_return_with_assignment
    - leading_newlines_in_multiline_strings
    - library_names
    - library_prefixes
    - library_private_types_in_public_api
    - lines_longer_than_80_chars
    - missing_whitespace_between_adjacent_strings
    - no_default_cases
    - no_leading_underscores_for_library_prefixes
    - no_leading_underscores_for_local_identifiers
    - no_runtimeType_toString
    - noop_primitive_operations
    - null_check_on_nullable_type_parameter
    - null_closures
    - omit_local_variable_types
    - one_member_abstracts
    - only_throw_errors
    - overridden_fields
    - package_api_docs
    - package_prefixed_library_names
    - parameter_assignments
    - prefer_adjacent_string_concatenation
    - prefer_asserts_in_initializer_lists
    - prefer_asserts_with_message
    - prefer_collection_literals
    - prefer_conditional_assignment
    - prefer_const_constructors
    - prefer_const_constructors_in_immutables
    - prefer_const_declarations
    - prefer_const_literals_to_create_immutables
    - prefer_constructors_over_static_methods
    - prefer_contains
    - prefer_expression_function_bodies
    - prefer_final_fields
    - prefer_final_in_for_each
    - prefer_final_locals
    - prefer_for_elements_to_map_fromIterable
    - prefer_foreach
    - prefer_function_declarations_over_variables
    - prefer_generic_function_type_aliases
    - prefer_if_elements_to_conditional_expressions
    - prefer_if_null_operators
    - prefer_initializing_formals
    - prefer_inlined_adds
    - prefer_int_literals
    - prefer_interpolation_to_compose_strings
    - prefer_is_empty
    - prefer_is_not_empty
    - prefer_is_not_operator
    - prefer_iterable_whereType
    - prefer_mixin
    - prefer_null_aware_method_calls
    - prefer_null_aware_operators
    - prefer_single_quotes
    - prefer_spread_collections
    - prefer_typing_uninitialized_variables
    - provide_deprecation_message
    - public_member_api_docs
    - recursive_getters
    - require_trailing_commas
    - sized_box_for_whitespace
    - sized_box_shrink_expand
    - slash_for_doc_comments
    - sort_child_properties_last
    - sort_constructors_first
    - sort_unnamed_constructors_first
    - tighten_type_of_initializing_formals
    - type_annotate_public_apis
    - type_init_formals
    - unawaited_futures
    - unnecessary_await_in_return
    - unnecessary_brace_in_string_interps
    - unnecessary_const
    - unnecessary_constructor_name
    - unnecessary_final
    - unnecessary_getters_setters
    - unnecessary_lambdas
    - unnecessary_late
    - unnecessary_new
    - unnecessary_null_aware_assignments
    - unnecessary_null_aware_operator_on_extension_on_nullable
    - unnecessary_null_checks
    - unnecessary_null_in_if_null_operators
    - unnecessary_nullable_for_final_variable_declarations
    - unnecessary_overrides
    - unnecessary_parenthesis
    - unnecessary_raw_strings
    - unnecessary_string_escapes
    - unnecessary_string_interpolations
    - unnecessary_this
    - unnecessary_to_list_in_spreads
    - unreachable_from_main
    - use_colored_box
    - use_decorated_box
    - use_enums
    - use_full_hex_values_for_flutter_colors
    - use_function_type_syntax_for_parameters
    - use_if_null_to_convert_nulls_to_bools
    - use_is_even_rather_than_modulo
    - use_key_in_widget_constructors
    - use_late_for_private_fields_and_variables
    - use_named_constants
    - use_raw_strings
    - use_rethrow_when_possible
    - use_setters_to_change_properties
    - use_string_buffers
    - use_super_parameters
    - use_test_throws_matchers
    - use_to_and_as_if_applicable
    - void_checks
`;

  return {
    path: "analysis_options.yaml",
    content,
  };
}

function generateMetricsHelper(): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Code Metrics Helper

/// Helper class for tracking code metrics
class CodeMetrics {
  final int totalFiles;
  final int totalLines;
  final int avgFileSize;
  final int complexity;
  final double? testCoverage;

  const CodeMetrics({
    required this.totalFiles,
    required this.totalLines,
    required this.avgFileSize,
    required this.complexity,
    this.testCoverage,
  });

  double get healthScore {
    double score = 100.0;

    // Penalize high complexity
    if (complexity > 3) score -= (complexity - 3) * 10;

    // Penalize large files
    if (avgFileSize > 300) score -= 10;
    if (avgFileSize > 500) score -= 10;

    // Bonus for test coverage
    if (testCoverage != null) {
      if (testCoverage! >= 80) score += 10;
      else if (testCoverage! < 50) score -= 15;
    }

    return score.clamp(0, 100);
  }

  String get healthGrade {
    final score = healthScore;
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  Map<String, dynamic> toJson() => {
    'totalFiles': totalFiles,
    'totalLines': totalLines,
    'avgFileSize': avgFileSize,
    'complexity': complexity,
    'testCoverage': testCoverage,
    'healthScore': healthScore,
    'healthGrade': healthGrade,
  };
}
`;

  return {
    path: "lib/core/analysis/code_metrics.dart",
    content,
  };
}

function generateLintRules(_config: AnalysisModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Custom Lint Rules Configuration

/// Configuration for custom lint rules
class LintConfig {
  /// Maximum allowed file length in lines
  static const int maxFileLength = 500;

  /// Maximum allowed function length in lines
  static const int maxFunctionLength = 50;

  /// Maximum allowed class length in lines
  static const int maxClassLength = 300;

  /// Maximum allowed nesting depth
  static const int maxNestingDepth = 4;

  /// Maximum allowed parameters per function
  static const int maxParameters = 7;

  /// Maximum allowed cyclomatic complexity
  static const int maxComplexity = 10;

  /// Whether to enforce final local variables
  static const bool enforceFinalLocals = true;

  /// Whether to enforce const constructors
  static const bool enforceConstConstructors = true;

  /// Whether to require documentation for public APIs
  static const bool requirePublicApiDocs = true;

  /// Ignored files patterns
  static const List<String> ignoredPatterns = [
    '*.g.dart',
    '*.freezed.dart',
    '*.gen.dart',
  ];
}
`;

  return {
    path: "lib/core/analysis/lint_config.dart",
    content,
  };
}

export default analysisHooks;
