/**
 * Performance Module Templates
 *
 * Handlebars templates for performance monitoring code generation
 */

import type { Template } from "../../core/types.js";

// ============================================================================
// RAW TEMPLATE STRINGS
// ============================================================================

const PERFORMANCE_MONITORING_MIXIN_SOURCE = `import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Performance monitoring mixin
mixin PerformanceMonitoring<T extends StatefulWidget> on State<T> {
  final Stopwatch _buildStopwatch = Stopwatch();
  int _buildCount = 0;

  void startBuildMeasurement() {
    if (kDebugMode) {
      _buildStopwatch.reset();
      _buildStopwatch.start();
    }
  }

  void endBuildMeasurement() {
    if (kDebugMode) {
      _buildStopwatch.stop();
      _buildCount++;
      if (_buildStopwatch.elapsedMilliseconds > {{maxBuildTimeMs}}) {
        debugPrint('[Perf] \${widget.runtimeType} slow: \${_buildStopwatch.elapsedMilliseconds}ms');
      }
    }
  }

  @override
  void dispose() {
    if (kDebugMode) {
      debugPrint('[Perf] \${widget.runtimeType}: \$_buildCount builds');
    }
    super.dispose();
  }
}
`;

const MEMORY_TRACKER_SOURCE = `import 'dart:async';
import 'package:flutter/widgets.dart';

/// Memory tracking mixin for automatic resource cleanup
mixin MemoryTracker<T extends StatefulWidget> on State<T> {
  final List<StreamSubscription> _subscriptions = [];
  final List<StreamController> _controllers = [];
  final List<AnimationController> _animations = [];

  void track(dynamic resource) {
    if (resource is StreamSubscription) {
      _subscriptions.add(resource);
    } else if (resource is StreamController) {
      _controllers.add(resource);
    } else if (resource is AnimationController) {
      _animations.add(resource);
    }
  }

  void safeSetState(VoidCallback fn) {
    if (mounted) setState(fn);
  }

  @override
  void dispose() {
    for (final s in _subscriptions) s.cancel();
    for (final c in _controllers) c.close();
    for (final a in _animations) a.dispose();
    super.dispose();
  }
}
`;

const ASSET_OPTIMIZER_SOURCE = `#!/bin/bash
# Asset Optimization Script

ASSETS_DIR="{{assetsPath}}"
OUTPUT_DIR="\${ASSETS_DIR}/optimized"

mkdir -p "\$OUTPUT_DIR"

{{#if compressImages}}
# Compress images
find "\$ASSETS_DIR" -name "*.png" -o -name "*.jpg" | while read img; do
  convert "\$img" -strip -quality {{quality}} "\$OUTPUT_DIR/$(basename "\$img")"
done
{{/if}}

{{#if generateWebP}}
# Generate WebP
find "\$ASSETS_DIR" -name "*.png" -o -name "*.jpg" | while read img; do
  cwebp -q 80 "\$img" -o "\$OUTPUT_DIR/$(basename "\${img%.*}").webp"
done
{{/if}}

echo "Done! Check \$OUTPUT_DIR"
`;

const CI_WORKFLOW_SOURCE = `name: Performance

on:
  pull_request:
    branches: [{{defaultBranch}}]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2

      - run: flutter pub get
      - run: flutter analyze

      - name: Check build size
        run: |
          flutter build apk --release
          SIZE=$(stat -c%s build/app/outputs/flutter-apk/app-release.apk)
          MB=$(echo "scale=2; \$SIZE / 1048576" | bc)
          echo "Size: \$MB MB"
          if (( $(echo "\$MB > {{maxSizeMB}}" | bc -l) )); then
            exit 1
          fi
`;

const PERFORMANCE_REPORT_SOURCE = `# Performance Report

Generated: {{timestamp}}

## Build Size

| Platform | Size | Threshold | Status |
|----------|------|-----------|--------|
{{#each builds}}
| {{platform}} | {{size}} MB | {{threshold}} MB | {{#if passed}}PASS{{else}}FAIL{{/if}} |
{{/each}}

## Memory Issues

{{#if memoryIssues}}
| File | Issue | Severity |
|------|-------|----------|
{{#each memoryIssues}}
| {{file}} | {{issue}} | {{severity}} |
{{/each}}
{{else}}
No memory issues detected.
{{/if}}

## Recommendations

{{#each recommendations}}
- {{this}}
{{/each}}
`;

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const PERFORMANCE_TEMPLATES: Template[] = [
  {
    id: "performance-monitoring-mixin",
    name: "Performance Monitoring Mixin",
    description: "Mixin for tracking widget build performance",
    type: "file",
    source: PERFORMANCE_MONITORING_MIXIN_SOURCE,
    output: {
      path: "lib/core/performance",
      filename: "performance_mixin",
      extension: "dart",
    },
  },
  {
    id: "performance-memory-tracker",
    name: "Memory Tracker",
    description: "Mixin for tracking and cleaning up resources",
    type: "file",
    source: MEMORY_TRACKER_SOURCE,
    output: {
      path: "lib/core/performance",
      filename: "memory_tracker",
      extension: "dart",
    },
  },
  {
    id: "performance-asset-optimizer",
    name: "Asset Optimizer Script",
    description: "Shell script for optimizing image assets",
    type: "file",
    source: ASSET_OPTIMIZER_SOURCE,
    output: {
      path: "scripts",
      filename: "optimize_assets",
      extension: "sh",
    },
  },
  {
    id: "performance-ci-workflow",
    name: "CI Performance Workflow",
    description: "GitHub Actions workflow for performance checks",
    type: "file",
    source: CI_WORKFLOW_SOURCE,
    output: {
      path: ".github/workflows",
      filename: "performance",
      extension: "yml",
    },
  },
  {
    id: "performance-report-template",
    name: "Performance Report",
    description: "Template for generating performance reports",
    type: "file",
    source: PERFORMANCE_REPORT_SOURCE,
    output: {
      path: "docs",
      filename: "performance-report",
      extension: "md",
    },
  },
];

export default PERFORMANCE_TEMPLATES;
