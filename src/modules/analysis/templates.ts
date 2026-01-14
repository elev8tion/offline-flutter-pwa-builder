/**
 * Analysis Module Templates
 *
 * Handlebars templates for analysis reports and configurations
 */

import type { Template } from "../../core/types.js";

// ============================================================================
// TEMPLATE SOURCES
// ============================================================================

const ANALYSIS_REPORT_SOURCE = `# Project Analysis Report

**Project:** {{projectName}}
**Generated:** {{timestamp}}

## Overview

| Property | Value |
|----------|-------|
| Architecture | {{architecture}} |
| State Management | {{stateManagement}} |
| Offline Strategy | {{offlineStrategy}} |

## Code Metrics

| Metric | Value |
|--------|-------|
| Total Files | {{metrics.totalFiles}} |
| Total Lines | {{metrics.totalLines}} |
| Avg File Size | {{metrics.avgFileSize}} |
| Complexity | {{metrics.complexity}}/5 |
{{#if metrics.testCoverage}}
| Test Coverage | {{metrics.testCoverage}}% |
{{/if}}

## Structure Analysis

- Models: {{#if structure.hasModels}}Yes{{else}}No{{/if}}
- Views: {{#if structure.hasViews}}Yes{{else}}No{{/if}}
- Controllers: {{#if structure.hasControllers}}Yes{{else}}No{{/if}}
- Services: {{#if structure.hasServices}}Yes{{else}}No{{/if}}
- Utils: {{#if structure.hasUtils}}Yes{{else}}No{{/if}}
- Tests: {{#if structure.hasTests}}Yes{{else}}No{{/if}}

## Best Practices

{{#each bestPractices}}
- [{{#if passed}}PASS{{else}}FAIL{{/if}}] {{name}}: {{message}}
{{/each}}

## Issues

{{#each issues}}
- [{{severity}}] {{category}}: {{message}}
{{#if suggestion}}
  - Suggestion: {{suggestion}}
{{/if}}
{{/each}}

## Recommendations

{{#each recommendations}}
{{@index}}. {{this}}
{{/each}}
`;

const DEPENDENCY_REPORT_SOURCE = `# Dependency Audit Report

**Project:** {{projectName}}
**Generated:** {{timestamp}}

## Summary

| Metric | Count |
|--------|-------|
| Total Dependencies | {{totalDependencies}} |
| Direct Dependencies | {{directDependencies}} |
| Dev Dependencies | {{devDependencies}} |
| Outdated | {{outdatedCount}} |

## By Category

{{#each categoryCounts}}
- {{@key}}: {{this}}
{{/each}}

## Dependencies

{{#each dependencies}}
### {{name}} ({{version}})
- Category: {{category}}
- Type: {{#if isDevDependency}}dev{{else}}runtime{{/if}}
{{#if outdated}}
- **OUTDATED** - Latest: {{latestVersion}}
{{/if}}
{{/each}}
`;

const METRICS_DASHBOARD_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Metrics Dashboard Widget

import 'package:flutter/material.dart';

/// Dashboard widget displaying code metrics
class MetricsDashboard extends StatelessWidget {
  final int totalFiles;
  final int totalLines;
  final int avgFileSize;
  final int complexity;
  final double? testCoverage;

  const MetricsDashboard({
    super.key,
    required this.totalFiles,
    required this.totalLines,
    required this.avgFileSize,
    required this.complexity,
    this.testCoverage,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Code Metrics',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            _buildMetricRow(context, 'Total Files', totalFiles.toString()),
            _buildMetricRow(context, 'Total Lines', totalLines.toString()),
            _buildMetricRow(context, 'Avg File Size', '\$avgFileSize lines'),
            _buildMetricRow(context, 'Complexity', '\$complexity/5'),
            if (testCoverage != null)
              _buildMetricRow(context, 'Test Coverage', '\${testCoverage!.toStringAsFixed(1)}%'),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricRow(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
`;

const HEALTH_INDICATOR_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Project Health Indicator Widget

import 'package:flutter/material.dart';

/// Widget displaying project health score
class HealthIndicator extends StatelessWidget {
  final double score;

  const HealthIndicator({
    super.key,
    required this.score,
  });

  Color get _color {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }

  String get _grade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color, width: 2),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _grade,
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: _color,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Health Score',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          Text(
            '\${score.toStringAsFixed(0)}%',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: _color,
            ),
          ),
        ],
      ),
    );
  }
}
`;

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const ANALYSIS_TEMPLATES: Template[] = [
  {
    id: "analysis-report",
    name: "Analysis Report",
    description: "Markdown report of project analysis results",
    type: "file",
    source: ANALYSIS_REPORT_SOURCE,
    output: {
      path: "docs",
      filename: "analysis_report",
      extension: "md",
    },
  },
  {
    id: "analysis-dependency-report",
    name: "Dependency Report",
    description: "Markdown report of dependency audit",
    type: "file",
    source: DEPENDENCY_REPORT_SOURCE,
    output: {
      path: "docs",
      filename: "dependency_report",
      extension: "md",
    },
  },
  {
    id: "analysis-metrics-dashboard",
    name: "Metrics Dashboard",
    description: "Flutter widget for displaying code metrics",
    type: "file",
    source: METRICS_DASHBOARD_SOURCE,
    output: {
      path: "lib/widgets/analysis",
      filename: "metrics_dashboard",
      extension: "dart",
    },
  },
  {
    id: "analysis-health-indicator",
    name: "Health Indicator",
    description: "Flutter widget showing project health score",
    type: "file",
    source: HEALTH_INDICATOR_SOURCE,
    output: {
      path: "lib/widgets/analysis",
      filename: "health_indicator",
      extension: "dart",
    },
  },
];

export default ANALYSIS_TEMPLATES;
