# MCP Tool Registry

Generated: 2026-01-16T22:42:25.226Z

Total tools: 102

## Counts By Group

| Group | Count |
| --- | ---: |
| core | 13 |
| drift | 17 |
| pwa | 6 |
| state | 4 |
| security | 4 |
| build | 11 |
| testing | 6 |
| performance | 6 |
| accessibility | 4 |
| api | 3 |
| design | 14 |
| analysis | 4 |
| github | 7 |
| aliases | 3 |

## core

| Tool | Description |
| --- | --- |
| `project_list` | List all projects |
| `project_get` | Get project details by ID |
| `project_update` | Update project configuration |
| `project_delete` | Delete a project by ID |
| `project_export_files` | Export files without full build pipeline |
| `project_validate_build` | Pre-flight check before build |
| `project_configure_environment` | Configure environment variables and settings |
| `module_list` | List all available modules |
| `module_info` | Get detailed information about a module |
| `module_install` | Install a module into a project |
| `module_uninstall` | Remove a module from a project |
| `template_list` | List all available templates |
| `template_preview` | Preview a template with sample data |

## drift

| Tool | Description |
| --- | --- |
| `drift_add_table` | Add a new table to the Drift database schema. Tables are defined with columns, optional timestamps, and soft delete support. |
| `drift_add_relation` | Add a relationship between two tables. Supports one-to-one, one-to-many, and many-to-many relations. |
| `drift_generate_dao` | Generate a Data Access Object (DAO) for a table with standard CRUD operations and optional custom methods. |
| `drift_create_migration` | Create a database migration for schema changes. Migrations support both upgrade and rollback. |
| `drift_enable_encryption` | Enable SQLCipher encryption for the database with a specified key management strategy. |
| `drift_run_codegen` | Run Drift code generation (build_runner) to generate .g.dart files. |
| `drift_configure_conflict_resolution` | Configure conflict resolution strategy for syncing offline changes with server data. |
| `drift_configure_background_sync` | Configure background synchronization service for offline data. |
| `drift_configure_offline_indicator` | Configure UI components for offline status indication. |
| `drift_configure_optimistic_updates` | Configure optimistic UI updates with rollback support. |
| `drift_configure_retry_policy` | Configure retry policies for failed sync operations. |
| `drift_configure_pagination` | Configure pagination for large datasets. |
| `drift_configure_lazy_loading` | Configure lazy loading for related entities and large datasets. |
| `drift_configure_query_cache` | Configure in-memory query result caching. |
| `drift_configure_batch_operations` | Configure batch insert, update, and delete operations. |
| `drift_configure_data_compression` | Configure data compression for storage efficiency. |
| `drift_generate_seed_data` | Generate seed data for database testing and development. |

## pwa

| Tool | Description |
| --- | --- |
| `pwa_configure_manifest` | Configure PWA manifest settings (name, colors, display mode, etc.) |
| `pwa_generate_icons` | Generate PWA icons configuration (standard and maskable sizes) |
| `pwa_configure_caching` | Configure service worker caching strategies and rules |
| `pwa_add_shortcut` | Add a PWA shortcut (app launcher shortcut) |
| `pwa_configure_install_prompt` | Configure the PWA install prompt behavior and appearance |
| `pwa_generate_manifest` | Generate the manifest.json file content from current config |

## state

| Tool | Description |
| --- | --- |
| `state_create_provider` | Create a Riverpod provider for state management |
| `state_create_bloc` | Create a BLoC (Business Logic Component) with events and states |
| `state_generate_feature` | Generate a complete feature with state, repository, and model |
| `state_configure_offline_sync` | Configure offline sync settings for state management |

## security

| Tool | Description |
| --- | --- |
| `security_enable_encryption` | Enable encryption for data at rest with configurable algorithm and key derivation |
| `security_add_validation` | Add input validation rules to prevent injection attacks |
| `security_audit` | Run a security audit on the project to identify vulnerabilities |
| `security_classify_data` | Classify data with sensitivity levels and handling requirements |

## build

| Tool | Description |
| --- | --- |
| `project_create_scaffold` | Create a new Flutter PWA project scaffold with full configuration |
| `project_build_advanced` | Build the Flutter project for web with advanced optimizations |
| `project_install_dependencies` | Install Flutter/Dart dependencies (flutter pub get) |
| `project_serve` | Start a local development server with hot reload |
| `project_deploy` | Deploy the built project to a hosting platform |
| `project_configure_deployment` | Configure deployment platform settings |
| `project_validate_advanced` | Validate project configuration and build structure |
| `project_export` | Export project as a standalone package or archive |
| `project_test_offline` | Test offline functionality by simulating network conditions |
| `project_audit` | Run Lighthouse PWA audit for performance and best practices |
| `project_configure_cicd` | Configure CI/CD pipeline for automated builds and deployments |

## testing

| Tool | Description |
| --- | --- |
| `testing_generate_unit` | Generate unit tests for a Dart class with Mockito mocks, constructor tests, method tests, and edge cases |
| `testing_generate_widget` | Generate widget tests with rendering, interaction, accessibility, and responsive tests |
| `testing_generate_integration` | Generate integration/e2e tests for user flows with navigation, interactions, and assertions |
| `testing_generate_mocks` | Generate Mockito mock classes for dependency injection and testing |
| `testing_configure_coverage` | Configure test coverage requirements and exclusions |
| `testing_run_with_coverage` | Run tests with coverage analysis and generate reports |

## performance

| Tool | Description |
| --- | --- |
| `performance_analyze` | Comprehensive performance analysis including memory leaks, build size, and render performance |
| `performance_check_memory_leaks` | Detect potential memory leaks from unclosed controllers, subscriptions, and setState after dispose |
| `performance_analyze_build_size` | Analyze build output size and provide optimization recommendations |
| `performance_optimize_assets` | Generate asset optimization script for images and other assets |
| `performance_generate_report` | Generate a comprehensive performance report |
| `performance_configure_thresholds` | Configure performance thresholds and limits |

## accessibility

| Tool | Description |
| --- | --- |
| `accessibility_audit_wcag` | Audit Flutter project for WCAG accessibility compliance. Checks semantic labels, touch targets, form labels, and screen reader support. |
| `accessibility_generate_fixes` | Generate accessibility fixes for identified issues. Creates semantic wrappers, touch target improvements, and label additions. |
| `accessibility_setup_i18n` | Setup internationalization (i18n) for Flutter project. Configures flutter_localizations and generates l10n.yaml. |
| `accessibility_generate_translations` | Generate translation files (ARB) for specified keys. Creates localized string entries for all configured languages. |

## api

| Tool | Description |
| --- | --- |
| `api_generate_client` | Generate a Dio-based API client with interceptors, error handling, and retry logic for Flutter. |
| `api_create_mock_server` | Create a mock server with configurable endpoints for development and testing. |
| `api_generate_json_model` | Generate JSON-serializable Dart model from schema with optional repository. |

## design

| Tool | Description |
| --- | --- |
| `design_generate_theme` | Generate a complete Flutter theme with Material 3, colors, typography, optional dark mode, and glassmorphic UI components. |
| `design_create_animation` | Create Flutter animations with various effects (fade, slide, scale, rotation) and customizable timing. |
| `design_generate_tokens` | Generate design tokens for colors, spacing, typography, and shadows in various formats. |
| `design_generate_edc_tokens` | Generate EDC design token system with AppSpacing, AppColors, AppRadius, AppBorders, AppAnimations, AppSizes, AppBlur, and ThemeExtension. |
| `design_generate_gradients` | Generate glassmorphic gradient system with 4 glass levels, status gradients, background gradients, and helper methods. |
| `design_generate_wcag` | Generate WCAG 2.1 contrast calculator with AA/AAA checking, relative luminance calculation, and theme verification. |
| `design_generate_glass_card` | Generate glass card component with BackdropFilter blur and customizable styling. Includes both GlassCard (simple) and GlassContainer (advanced with shadows). |
| `design_generate_glass_button` | Generate interactive glass button with press animations, haptic feedback, and visual enhancements (blur, shadows, noise, light simulation). |
| `design_generate_glass_bottomsheet` | Generate glass bottom sheet component with BackdropFilter blur and helper function for easy usage. |
| `design_generate_shadows` | Generate dual shadow system with ambient and definition shadows for glass, card, and elevated surfaces. Uses Flutter 3.29+ withValues API. |
| `design_generate_text_shadows` | Generate 4-level text shadow system (subtle, medium, strong, bold) with pre-styled text styles for readable text on glass backgrounds. Uses Flutter 3.29+ withValues API. |
| `design_generate_noise_overlay` | Generate StaticNoiseOverlay widget for adding grain texture to glass surfaces. Uses seeded Random(42) for consistency. Includes CustomPainter for efficient rendering. |
| `design_generate_light_simulation` | Generate light simulation system for realistic glass effects via foreground gradient overlays. Creates BoxDecoration helpers for various lighting patterns (top-down, diagonal, reversed). |
| `design_generate_full_system` | Generate complete glassmorphic design system with all tokens, gradients, shadows, components, and theme in a single call |

## analysis

| Tool | Description |
| --- | --- |
| `analysis_analyze_project` | Perform comprehensive analysis of a Flutter project including structure, patterns, and best practices |
| `analysis_audit_dependencies` | Audit project dependencies for outdated packages, vulnerabilities, and categorization |
| `analysis_detect_architecture` | Detect the architecture pattern used in the project and provide improvement suggestions |
| `analysis_generate_report` | Generate a comprehensive analysis report in various formats |

## github

| Tool | Description |
| --- | --- |
| `github_clone_repository` | Clone a GitHub repository to temporary directory for analysis |
| `github_analyze_flutter_project` | Deep analysis of Flutter project structure, architecture, and components |
| `github_extract_models` | Extract model/entity class definitions from Dart files |
| `github_extract_screens` | Extract screen/page widget definitions from Dart files |
| `github_create_rebuild_schema` | Transform analysis results into MCP project rebuild schema |
| `github_rebuild_project` | Execute project rebuild using MCP generation pipeline |
| `github_import_and_rebuild` | Combined tool: clone, analyze, and rebuild a GitHub Flutter project in one step |

## aliases

| Tool | Description |
| --- | --- |
| `project_create` | Create a new Flutter PWA project scaffold with full configuration (alias for project_create_scaffold) |
| `project_build` | Build the Flutter project for web with advanced optimizations (alias for project_build_advanced) |
| `project_validate` | Validate project configuration and build structure (alias for project_validate_advanced) |
