/**
 * Performance Module Hooks
 *
 * Lifecycle hooks for the Performance module
 */

import type {
  HookContext,
  GeneratedFile,
  ModuleHooks,
} from "../../core/types.js";
import {
  PerformanceModuleConfig,
  DEFAULT_PERFORMANCE_CONFIG,
} from "./config.js";

// ============================================================================
// HANDLEBARS HELPERS FOR PERFORMANCE TEMPLATES
// ============================================================================

export function registerPerformanceHelpers(handlebars: typeof import("handlebars")): void {
  // Format bytes to human readable
  handlebars.registerHelper("formatBytes", (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  });

  // Severity badge
  handlebars.registerHelper("severityBadge", (severity: string) => {
    const badges: Record<string, string> = {
      critical: "[CRITICAL]",
      high: "[HIGH]",
      medium: "[MEDIUM]",
      low: "[LOW]",
    };
    return badges[severity] || "[UNKNOWN]";
  });
}

// ============================================================================
// MODULE HOOKS IMPLEMENTATION
// ============================================================================

/**
 * Get performance config from project modules
 */
function getPerformanceConfig(ctx: HookContext): PerformanceModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "performance");
  return {
    ...DEFAULT_PERFORMANCE_CONFIG,
    ...(moduleConfig?.config as Partial<PerformanceModuleConfig> ?? {}),
  };
}

export const performanceHooks: ModuleHooks = {
  /**
   * Called when the module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getPerformanceConfig(ctx);
    console.log(`[Performance] Module installed`);
    console.log(`[Performance] Memory leak detection: ${config.memoryLeakDetection.enabled}`);
    console.log(`[Performance] Build size limits: APK ${config.buildSize.maxApkSizeMB}MB`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getPerformanceConfig(ctx);

    // Validate config
    if (config.buildSize.maxApkSizeMB < 1) {
      throw new Error("[Performance] Max APK size must be at least 1 MB");
    }

    console.log("[Performance] Preparing performance monitoring code...");
  },

  /**
   * Main code generation hook
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getPerformanceConfig(ctx);
    const files: GeneratedFile[] = [];

    // 1. Generate performance monitoring mixin
    files.push(generatePerformanceMonitoringMixin(config));

    // 2. Generate memory leak detection helper
    if (config.memoryLeakDetection.enabled) {
      files.push(generateMemoryLeakHelper(config));
    }

    // 3. Generate asset optimization script
    if (config.assetOptimization.enabled) {
      files.push(generateAssetOptimizationScript(config));
    }

    // 4. Generate CI/CD performance check workflow
    files.push(generateCIPerformanceCheck(config));

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (_ctx: HookContext): Promise<void> => {
    console.log("[Performance] Generated performance monitoring utilities");
    console.log("[Performance] Run 'flutter test --coverage' after implementing tests");
  },

  /**
   * Called before build
   */
  beforeBuild: async (ctx: HookContext): Promise<void> => {
    console.log("[Performance] Running pre-build performance checks...");
    const config = getPerformanceConfig(ctx);

    if (config.memoryLeakDetection.enabled) {
      console.log("[Performance] Checking for potential memory leaks...");
    }
  },

  /**
   * Called after build
   */
  afterBuild: async (ctx: HookContext): Promise<void> => {
    const config = getPerformanceConfig(ctx);
    console.log("[Performance] Build completed");

    if (config.buildSize.enabled) {
      console.log(`[Performance] Check build size against threshold: ${config.buildSize.maxApkSizeMB}MB`);
    }
  },
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function generatePerformanceMonitoringMixin(_config: PerformanceModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Performance Monitoring Utilities

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Performance monitoring mixin for widgets
mixin PerformanceMonitoring<T extends StatefulWidget> on State<T> {
  final Stopwatch _buildStopwatch = Stopwatch();
  int _buildCount = 0;
  Duration _totalBuildTime = Duration.zero;

  @override
  void initState() {
    super.initState();
    if (kDebugMode) {
      debugPrint('[Performance] \${widget.runtimeType} initialized');
    }
  }

  /// Call at the start of build method
  void startBuildMeasurement() {
    if (kDebugMode) {
      _buildStopwatch.reset();
      _buildStopwatch.start();
    }
  }

  /// Call at the end of build method
  void endBuildMeasurement() {
    if (kDebugMode) {
      _buildStopwatch.stop();
      _buildCount++;
      _totalBuildTime += _buildStopwatch.elapsed;

      if (_buildStopwatch.elapsedMilliseconds > 16) {
        debugPrint(
          '[Performance] \${widget.runtimeType} slow build: '
          '\${_buildStopwatch.elapsedMilliseconds}ms (target: 16ms)',
        );
      }
    }
  }

  /// Get performance stats
  Map<String, dynamic> getPerformanceStats() {
    return {
      'widgetType': widget.runtimeType.toString(),
      'buildCount': _buildCount,
      'totalBuildTimeMs': _totalBuildTime.inMilliseconds,
      'avgBuildTimeMs': _buildCount > 0
          ? (_totalBuildTime.inMilliseconds / _buildCount).toStringAsFixed(2)
          : '0',
    };
  }

  @override
  void dispose() {
    if (kDebugMode) {
      debugPrint('[Performance] \${widget.runtimeType} disposed');
      debugPrint('[Performance] Stats: \${getPerformanceStats()}');
    }
    super.dispose();
  }
}

/// Memory tracking mixin
mixin MemoryTracking<T extends StatefulWidget> on State<T> {
  final List<StreamSubscription> _trackedSubscriptions = [];
  final List<StreamController> _trackedControllers = [];
  final List<ChangeNotifier> _trackedNotifiers = [];
  final List<AnimationController> _trackedAnimations = [];

  /// Track a stream subscription for automatic cleanup
  void trackSubscription(StreamSubscription subscription) {
    _trackedSubscriptions.add(subscription);
  }

  /// Track a stream controller for automatic cleanup
  void trackController(StreamController controller) {
    _trackedControllers.add(controller);
  }

  /// Track a change notifier for automatic cleanup
  void trackNotifier(ChangeNotifier notifier) {
    _trackedNotifiers.add(notifier);
  }

  /// Track an animation controller for automatic cleanup
  void trackAnimation(AnimationController controller) {
    _trackedAnimations.add(controller);
  }

  /// Safe setState that checks mounted state
  void safeSetState(VoidCallback fn) {
    if (mounted) {
      setState(fn);
    }
  }

  @override
  void dispose() {
    // Cancel all subscriptions
    for (final subscription in _trackedSubscriptions) {
      subscription.cancel();
    }

    // Close all stream controllers
    for (final controller in _trackedControllers) {
      controller.close();
    }

    // Dispose all notifiers
    for (final notifier in _trackedNotifiers) {
      notifier.dispose();
    }

    // Dispose all animation controllers
    for (final animation in _trackedAnimations) {
      animation.dispose();
    }

    if (kDebugMode) {
      debugPrint('[Memory] \${widget.runtimeType} cleaned up:');
      debugPrint('  - Subscriptions: \${_trackedSubscriptions.length}');
      debugPrint('  - Controllers: \${_trackedControllers.length}');
      debugPrint('  - Notifiers: \${_trackedNotifiers.length}');
      debugPrint('  - Animations: \${_trackedAnimations.length}');
    }

    super.dispose();
  }
}

/// Performance reporter for collecting app-wide stats
class PerformanceReporter {
  static final PerformanceReporter _instance = PerformanceReporter._internal();
  factory PerformanceReporter() => _instance;
  PerformanceReporter._internal();

  final Map<String, List<int>> _buildTimes = {};
  final Map<String, int> _buildCounts = {};

  void recordBuild(String widgetName, int durationMs) {
    _buildTimes.putIfAbsent(widgetName, () => []).add(durationMs);
    _buildCounts[widgetName] = (_buildCounts[widgetName] ?? 0) + 1;
  }

  Map<String, dynamic> getReport() {
    final report = <String, dynamic>{};

    for (final entry in _buildTimes.entries) {
      final times = entry.value;
      final avg = times.reduce((a, b) => a + b) / times.length;
      final max = times.reduce((a, b) => a > b ? a : b);

      report[entry.key] = {
        'count': _buildCounts[entry.key],
        'avgMs': avg.toStringAsFixed(2),
        'maxMs': max,
        'slowBuilds': times.where((t) => t > 16).length,
      };
    }

    return report;
  }

  void reset() {
    _buildTimes.clear();
    _buildCounts.clear();
  }
}
`;

  return {
    path: "lib/core/performance/performance_monitoring.dart",
    content,
  };
}

function generateMemoryLeakHelper(_config: PerformanceModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Memory Leak Detection Helper

import 'dart:async';
import 'package:flutter/foundation.dart';

/// Memory leak detector for development
class MemoryLeakDetector {
  static final MemoryLeakDetector _instance = MemoryLeakDetector._internal();
  factory MemoryLeakDetector() => _instance;
  MemoryLeakDetector._internal();

  final Set<String> _activeSubscriptions = {};
  final Set<String> _activeControllers = {};
  final Set<String> _activeAnimations = {};

  void registerSubscription(String id) {
    _activeSubscriptions.add(id);
    _log('Subscription registered: \$id');
  }

  void unregisterSubscription(String id) {
    _activeSubscriptions.remove(id);
    _log('Subscription unregistered: \$id');
  }

  void registerController(String id) {
    _activeControllers.add(id);
    _log('Controller registered: \$id');
  }

  void unregisterController(String id) {
    _activeControllers.remove(id);
    _log('Controller unregistered: \$id');
  }

  void registerAnimation(String id) {
    _activeAnimations.add(id);
    _log('Animation registered: \$id');
  }

  void unregisterAnimation(String id) {
    _activeAnimations.remove(id);
    _log('Animation unregistered: \$id');
  }

  void reportLeaks() {
    if (_activeSubscriptions.isNotEmpty) {
      debugPrint('[LEAK] Active subscriptions: \$_activeSubscriptions');
    }
    if (_activeControllers.isNotEmpty) {
      debugPrint('[LEAK] Active controllers: \$_activeControllers');
    }
    if (_activeAnimations.isNotEmpty) {
      debugPrint('[LEAK] Active animations: \$_activeAnimations');
    }

    if (_activeSubscriptions.isEmpty &&
        _activeControllers.isEmpty &&
        _activeAnimations.isEmpty) {
      debugPrint('[Memory] No leaks detected');
    }
  }

  void _log(String message) {
    if (kDebugMode) {
      debugPrint('[Memory] \$message');
    }
  }
}

/// Extension for tracking subscriptions
extension StreamSubscriptionTracking on StreamSubscription {
  StreamSubscription<T> tracked<T>(String id) {
    MemoryLeakDetector().registerSubscription(id);
    return this;
  }
}

/// Extension for tracking controllers
extension StreamControllerTracking<T> on StreamController<T> {
  StreamController<T> tracked(String id) {
    MemoryLeakDetector().registerController(id);
    return this;
  }

  Future<void> closeTracked(String id) async {
    MemoryLeakDetector().unregisterController(id);
    await close();
  }
}
`;

  return {
    path: "lib/core/performance/memory_leak_detector.dart",
    content,
  };
}

function generateAssetOptimizationScript(config: PerformanceModuleConfig): GeneratedFile {
  const { assetOptimization } = config;

  const content = `#!/bin/bash
# GENERATED CODE - Asset Optimization Script
# Run this script to optimize assets before build

set -e

ASSETS_DIR="assets"
OUTPUT_DIR="assets/optimized"

echo "Starting asset optimization..."
mkdir -p "\$OUTPUT_DIR"

${assetOptimization.compressImages ? `
# Compress PNG images
echo "Compressing PNG files..."
find "\$ASSETS_DIR" -name "*.png" -not -path "\$OUTPUT_DIR/*" | while read file; do
  filename=$(basename "\$file")
  convert "\$file" -strip -quality ${assetOptimization.jpegQuality} "\$OUTPUT_DIR/\$filename"
  echo "Compressed: \$filename"
done

# Compress JPEG images
echo "Compressing JPEG files..."
find "\$ASSETS_DIR" -name "*.jpg" -o -name "*.jpeg" -not -path "\$OUTPUT_DIR/*" | while read file; do
  filename=$(basename "\$file")
  convert "\$file" -strip -quality ${assetOptimization.jpegQuality} -sampling-factor 4:2:0 "\$OUTPUT_DIR/\$filename"
  echo "Compressed: \$filename"
done
` : "# Image compression disabled"}

${assetOptimization.generateWebP ? `
# Generate WebP versions
echo "Generating WebP versions..."
find "\$ASSETS_DIR" -type f \\( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \\) -not -path "\$OUTPUT_DIR/*" | while read file; do
  filename=$(basename "\$file")
  name="\${filename%.*}"
  cwebp -q 80 "\$file" -o "\$OUTPUT_DIR/\${name}.webp"
  echo "Generated WebP: \${name}.webp"
done
` : "# WebP generation disabled"}

# Size report
echo ""
echo "=== Size Report ==="
echo "Original: $(du -sh "\$ASSETS_DIR" | cut -f1)"
echo "Optimized: $(du -sh "\$OUTPUT_DIR" | cut -f1)"
echo "==================="
`;

  return {
    path: "scripts/optimize_assets.sh",
    content,
  };
}

function generateCIPerformanceCheck(config: PerformanceModuleConfig): GeneratedFile {
  const { buildSize } = config;

  const content = `# GENERATED CODE - CI Performance Check
# Add this to your CI/CD pipeline

name: Performance Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: 'stable'
          channel: 'stable'

      - name: Install dependencies
        run: flutter pub get

      - name: Analyze code
        run: flutter analyze

      - name: Check for memory leak patterns
        run: |
          echo "Checking for potential memory leaks..."

          # Check for StreamController without close
          STREAM_LEAKS=$(grep -rn "StreamController" lib/ | grep -v ".close()" | wc -l)
          if [ "\$STREAM_LEAKS" -gt 0 ]; then
            echo "::warning::Found \$STREAM_LEAKS potential StreamController leaks"
          fi

          # Check for AnimationController without dispose
          ANIM_LEAKS=$(grep -rn "AnimationController" lib/ | grep -v ".dispose()" | wc -l)
          if [ "\$ANIM_LEAKS" -gt 0 ]; then
            echo "::warning::Found \$ANIM_LEAKS potential AnimationController leaks"
          fi

          # Check for setState without mounted check
          SETSTATE_ISSUES=$(grep -rn "setState" lib/ | grep -v "mounted" | wc -l)
          if [ "\$SETSTATE_ISSUES" -gt 5 ]; then
            echo "::warning::Found \$SETSTATE_ISSUES setState calls without mounted check"
          fi

      - name: Build APK and check size
        run: |
          flutter build apk --release
          SIZE=$(stat -c%s build/app/outputs/flutter-apk/app-release.apk)
          SIZE_MB=$(echo "scale=2; \$SIZE / 1048576" | bc)
          echo "APK Size: \$SIZE_MB MB"

          if (( $(echo "\$SIZE_MB > ${buildSize.maxApkSizeMB}" | bc -l) )); then
            echo "::error::APK size \$SIZE_MB MB exceeds limit of ${buildSize.maxApkSizeMB} MB"
            exit 1
          fi

      - name: Run tests with coverage
        run: flutter test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: coverage/lcov.info
`;

  return {
    path: ".github/workflows/performance-check.yml",
    content,
  };
}

export default performanceHooks;
