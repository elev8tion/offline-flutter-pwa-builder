# Diagnostics & Analytics Module Specification

## Overview

Add comprehensive observability to the MCP server to capture errors, warnings, edge cases, and performance metrics during operation. This enables continuous improvement through real-world usage data.

---

## Module Structure

```
src/modules/diagnostics/
├── index.ts           # Module definition
├── config.ts          # Configuration & schemas
├── logger.ts          # Core logging system
├── analytics.ts       # Usage analytics & metrics
├── issue-tracker.ts   # Structured issue reporting
├── performance.ts     # Performance monitoring
└── reporters/
    ├── file-reporter.ts      # Write to JSON/JSONL files
    ├── console-reporter.ts   # Pretty console output
    └── markdown-reporter.ts  # Human-readable reports
```

---

## Features

### 1. **Error Logging**
Capture all errors with full context:
```typescript
{
  timestamp: "2026-01-16T10:30:45.123Z",
  level: "error",
  tool: "github_analyze_flutter_project",
  operation: "extract_models",
  error: {
    message: "Failed to parse Dart class",
    stack: "...",
    code: "PARSE_ERROR"
  },
  context: {
    projectId: "abc123",
    filePath: "lib/models/user.dart",
    lineNumber: 42,
    input: { localPath: "/tmp/...", analyzeDepth: "deep" }
  },
  environment: {
    nodeVersion: "20.10.0",
    platform: "darwin",
    mcpVersion: "1.0.0"
  }
}
```

### 2. **Warning Tracking**
Non-fatal issues that might need attention:
```typescript
{
  timestamp: "2026-01-16T10:30:45.123Z",
  level: "warning",
  tool: "github_analyze_flutter_project",
  code: "ARCHITECTURE_LOW_CONFIDENCE",
  message: "Architecture detection confidence below 50%",
  context: {
    detected: "custom",
    confidence: 35,
    reasoning: ["No clear architecture pattern detected"]
  },
  suggestion: "Consider manual architecture specification"
}
```

### 3. **Edge Case Detection**
Unusual patterns worth investigating:
```typescript
{
  timestamp: "2026-01-16T10:30:45.123Z",
  level: "info",
  type: "edge_case",
  tool: "drift_add_table",
  pattern: "VERY_LARGE_TABLE",
  details: {
    tableName: "products",
    columnCount: 87,
    threshold: 50
  },
  note: "Unusually large table may impact performance"
}
```

### 4. **Performance Metrics**
Track operation durations and resource usage:
```typescript
{
  timestamp: "2026-01-16T10:30:45.123Z",
  type: "performance",
  tool: "github_rebuild_project",
  metrics: {
    duration: 45230,  // ms
    memoryUsed: 234567890,  // bytes
    filesGenerated: 156,
    linesOfCode: 8934
  },
  breakdown: {
    analysis: 5230,
    generation: 35000,
    formatting: 5000
  }
}
```

### 5. **Usage Analytics**
Track tool usage patterns:
```typescript
{
  sessionId: "sess_abc123",
  toolUsage: {
    "github_import_and_rebuild": { count: 3, avgDuration: 45000 },
    "design_generate_full_system": { count: 5, avgDuration: 2300 },
    "drift_add_table": { count: 12, avgDuration: 150 }
  },
  successRate: 0.94,
  commonErrors: [
    { code: "PARSE_ERROR", count: 2 },
    { code: "NETWORK_TIMEOUT", count: 1 }
  ]
}
```

---

## Configuration

### User Configuration (src/modules/diagnostics/config.ts)

```typescript
export interface DiagnosticsConfig {
  enabled: boolean;

  // What to log
  logLevels: ('debug' | 'info' | 'warning' | 'error')[];
  captureErrors: boolean;
  captureWarnings: boolean;
  captureEdgeCases: boolean;
  capturePerformance: boolean;
  captureUsageAnalytics: boolean;

  // Storage
  outputDir: string;  // Default: ~/.mcp-offline-flutter-pwa/diagnostics
  format: 'json' | 'jsonl' | 'markdown';
  maxFileSize: number;  // MB
  retention: number;  // days

  // Privacy
  anonymizeProjectPaths: boolean;
  includeStackTraces: boolean;
  includeInputData: boolean;

  // Reporting
  generateDailySummary: boolean;
  reporters: ('file' | 'console' | 'markdown')[];

  // Performance
  sampleRate: number;  // 0-1, sample percentage for performance tracking
  asyncWrite: boolean;  // Don't block tool execution
}

export const DEFAULT_DIAGNOSTICS_CONFIG: DiagnosticsConfig = {
  enabled: true,
  logLevels: ['warning', 'error'],
  captureErrors: true,
  captureWarnings: true,
  captureEdgeCases: true,
  capturePerformance: true,
  captureUsageAnalytics: true,
  outputDir: '~/.mcp-offline-flutter-pwa/diagnostics',
  format: 'jsonl',
  maxFileSize: 10,  // 10 MB
  retention: 30,  // 30 days
  anonymizeProjectPaths: false,
  includeStackTraces: true,
  includeInputData: true,
  generateDailySummary: true,
  reporters: ['file', 'console'],
  sampleRate: 1.0,  // 100% for personal use
  asyncWrite: true,
};
```

---

## API Design

### Core Logger API

```typescript
import { DiagnosticsLogger } from './modules/diagnostics';

// Initialize in src/index.ts
const diagnostics = new DiagnosticsLogger(config);

// Use in any module
diagnostics.error('github_analyze_flutter_project', {
  operation: 'extract_models',
  error: err,
  context: { filePath, lineNumber },
  input: args,
});

diagnostics.warning('drift_add_table', {
  code: 'LARGE_TABLE',
  message: 'Table has 87 columns',
  context: { tableName, columnCount },
  suggestion: 'Consider splitting into multiple tables',
});

diagnostics.edgeCase('github_analyze_flutter_project', {
  pattern: 'ARCHITECTURE_HYBRID',
  details: { detected: 'custom', hasCleanAndFeatureFirst: true },
  note: 'Project mixes Clean Architecture and Feature-First patterns',
});

diagnostics.performance('github_rebuild_project', {
  duration: 45230,
  metrics: { filesGenerated: 156, linesOfCode: 8934 },
  breakdown: { analysis: 5230, generation: 35000 },
});
```

### Decorator Pattern for Auto-Tracking

```typescript
// Add @tracked to any tool handler
@tracked('github_analyze_flutter_project')
async function handleAnalyzeFlutterProject(args: any): Promise<any> {
  // Automatically logs:
  // - Start time
  // - End time / duration
  // - Success/failure
  // - Input parameters (if enabled)
  // - Errors with full context

  const result = await doAnalysis(args);
  return result;
}
```

---

## Output Formats

### 1. JSONL (Default - Machine Readable)
```jsonl
{"timestamp":"2026-01-16T10:30:45.123Z","level":"error","tool":"github_analyze_flutter_project",...}
{"timestamp":"2026-01-16T10:31:12.456Z","level":"warning","tool":"drift_add_table",...}
{"timestamp":"2026-01-16T10:32:05.789Z","level":"info","type":"performance","tool":"github_rebuild_project",...}
```

**Location:** `~/.mcp-offline-flutter-pwa/diagnostics/YYYY-MM-DD.jsonl`

### 2. Daily Markdown Report (Human Readable)
```markdown
# Diagnostics Report - 2026-01-16

## Summary
- Total operations: 45
- Success rate: 93.3% (42/45)
- Errors: 2
- Warnings: 5
- Edge cases detected: 3

## Errors
### 1. Parse Error in github_analyze_flutter_project
**Time:** 10:30:45
**File:** lib/models/user.dart:42
**Error:** Failed to parse Dart class with annotation @CustomAnnotation
**Stack:** ...
**Suggestion:** Add support for custom annotations in parser

### 2. Network Timeout in github_clone_repository
**Time:** 14:22:10
**URL:** https://github.com/large/repo.git
**Error:** Clone timeout after 60s
**Suggestion:** Increase timeout for large repos

## Warnings
- Architecture detection confidence below 50% (3 occurrences)
- Large table detected: products (87 columns)
- WASM bundle size exceeds 15MB

## Edge Cases
- Hybrid architecture pattern detected (Clean + Feature-First)
- Deeply nested folder structure (8 levels)
- Model with 45 fields

## Performance
- Average operation duration: 2.3s
- Slowest operation: github_rebuild_project (45.2s)
- Memory peak: 456 MB

## Recommendations
1. Add support for custom Dart annotations
2. Increase git clone timeout configuration
3. Consider table splitting for large tables
4. Optimize WASM bundle size
```

**Location:** `~/.mcp-offline-flutter-pwa/diagnostics/reports/YYYY-MM-DD.md`

### 3. Console Output (Pretty)
```
⚠️  [10:30:45] github_analyze_flutter_project
    Architecture detection confidence low (35%)
    → Detected: custom
    → Suggestion: Consider manual architecture specification

❌ [10:31:12] drift_add_table
    Failed to create table 'users'
    → Error: Duplicate column name 'id'
    → File: src/modules/drift/tools.ts:234
```

---

## Integration Points

### 1. Tool Wrapper (src/tools/index.ts)
```typescript
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const startTime = Date.now();

  try {
    const handler = TOOL_HANDLERS.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await handler(args, context);

    // Log success
    context.diagnostics.performance(name, {
      duration: Date.now() - startTime,
      success: true,
    });

    return result;

  } catch (error) {
    // Log error with full context
    context.diagnostics.error(name, {
      error,
      input: args,
      duration: Date.now() - startTime,
    });

    throw error;
  }
}
```

### 2. Module Hooks (Automatic)
```typescript
// In each module's hooks.ts
export const hooks: ModuleHooks = {
  async onGenerate(ctx: HookContext) {
    try {
      // ... generation logic
    } catch (error) {
      ctx.diagnostics.error('drift_module', {
        operation: 'generate',
        error,
        context: { projectId: ctx.project.id },
      });
      throw error;
    }
  }
};
```

### 3. Custom Logging in Tools
```typescript
// In src/modules/github/analyzers/architecture-detector.ts
export async function detectArchitecture(
  libPath: string,
  diagnostics?: DiagnosticsLogger
): Promise<ArchitectureResult> {
  const result = await analyze(libPath);

  // Log low confidence
  if (result.confidence < 50) {
    diagnostics?.warning('architecture_detector', {
      code: 'LOW_CONFIDENCE',
      message: `Architecture detection confidence: ${result.confidence}%`,
      context: { detected: result.detected, reasoning: result.reasoning },
      suggestion: 'Consider manual architecture specification',
    });
  }

  // Log edge case: hybrid architecture
  if (result.detected === 'custom' && result.reasoning.includes('mixed')) {
    diagnostics?.edgeCase('architecture_detector', {
      pattern: 'HYBRID_ARCHITECTURE',
      details: { reasoning: result.reasoning },
      note: 'Project appears to mix multiple architecture patterns',
    });
  }

  return result;
}
```

---

## CLI Commands

### View Reports
```bash
# Show today's diagnostics
npm run diagnostics

# Show specific date
npm run diagnostics -- --date 2026-01-15

# Show only errors
npm run diagnostics -- --level error

# Generate markdown report
npm run diagnostics:report

# Clear old logs (older than retention period)
npm run diagnostics:clean
```

### Configuration
```bash
# Enable/disable diagnostics
npm run diagnostics:config -- --enabled true

# Set output directory
npm run diagnostics:config -- --output-dir ~/my-logs

# Set log levels
npm run diagnostics:config -- --levels warning,error
```

---

## Dashboard Idea (Future Enhancement)

HTML dashboard for visualizing diagnostics:

```
~/.mcp-offline-flutter-pwa/diagnostics/dashboard.html

┌─────────────────────────────────────────────────────┐
│ MCP Offline Flutter PWA Builder - Diagnostics       │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Success Rate: ████████████████░░ 93.3%              │
│                                                      │
│ Error Breakdown:                                     │
│ ┌──────────────────┬────────┐                       │
│ │ PARSE_ERROR      │ ████ 8 │                       │
│ │ NETWORK_TIMEOUT  │ ██ 3   │                       │
│ │ UNKNOWN          │ █ 1    │                       │
│ └──────────────────┴────────┘                       │
│                                                      │
│ Performance:                                         │
│ Avg duration: 2.3s                                   │
│ P95: 12.5s                                           │
│ P99: 45.2s                                           │
│                                                      │
│ Most Used Tools:                                     │
│ 1. design_generate_full_system (23)                 │
│ 2. drift_add_table (18)                              │
│ 3. github_analyze_flutter_project (12)              │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Core Logger (2 hours)
- Create diagnostics module structure
- Implement DiagnosticsLogger class
- Add file-reporter (JSONL output)
- Add console-reporter (pretty output)

### Phase 2: Integration (2 hours)
- Add diagnostics to ToolContext
- Wrap handleToolCall with logging
- Add @tracked decorator
- Test with existing tools

### Phase 3: Analytics & Reporting (2 hours)
- Implement usage analytics
- Create daily markdown reports
- Add CLI commands
- Add retention cleanup

### Phase 4: Enhancement (Optional)
- Add dashboard generator
- Add alert thresholds
- Add automatic issue reporting
- Add remote telemetry (opt-in)

---

## Privacy & Security

### Data Collected
- ✅ Error messages and stack traces
- ✅ Tool names and operation types
- ✅ Performance metrics (duration, memory)
- ✅ Input parameters (configurable)
- ⚠️ File paths (anonymizable)
- ❌ File contents (never)
- ❌ API keys or secrets (never)

### User Control
- All diagnostics opt-in (enabled by default but easily disabled)
- Granular control over what's logged
- Local-only storage (no external transmission)
- Easy to delete logs (`npm run diagnostics:clean`)

---

## Benefits

1. **Continuous Improvement:** Discover issues through real-world usage
2. **Faster Debugging:** Full context when errors occur
3. **Performance Optimization:** Identify slow operations
4. **Edge Case Discovery:** Find patterns you didn't anticipate
5. **Usage Insights:** Understand which tools are most valuable
6. **Regression Detection:** Track if new changes introduce issues

---

## Example Usage Workflow

```typescript
// 1. Run your tool normally
github_import_and_rebuild(url, outputPath)

// 2. If something goes wrong, check diagnostics
npm run diagnostics

// 3. See detailed error report
┌──────────────────────────────────────────────┐
│ Error in github_analyze_flutter_project      │
├──────────────────────────────────────────────┤
│ Failed to parse Dart class at:               │
│ lib/models/user.dart:42                      │
│                                              │
│ Error: Unexpected annotation @CustomAnnot... │
│                                              │
│ Stack trace:                                 │
│   at parseClass (model-extractor.ts:156)    │
│   at extractModels (model-extractor.ts:98)  │
│                                              │
│ Suggestion:                                  │
│ Add support for custom annotations           │
└──────────────────────────────────────────────┘

// 4. Fix the issue based on detailed context
// 5. Re-run and verify fix
```

---

## Questions for You

Before I implement this:

1. **Storage location:** Is `~/.mcp-offline-flutter-pwa/diagnostics` good, or prefer project-local `.diagnostics/`?
2. **Privacy:** Anonymize project paths by default, or keep them?
3. **Console output:** Want colored/pretty output, or minimal?
4. **Retention:** 30 days default okay?
5. **Format preference:** JSONL (machine-readable) or JSON (human-readable)?

Let me know your preferences and I'll implement this! 🚀
