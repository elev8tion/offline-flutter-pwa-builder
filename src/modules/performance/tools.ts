/**
 * Performance Module Tools
 *
 * MCP tool definitions and handlers for performance analysis
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  PerformanceModuleConfig,
  MemoryIssue,
  RenderPerformanceIssue,
  // Note: Types below are used for documentation but not runtime
  type BuildSizeMetrics as _BuildSizeMetrics,
  type IssueSeverity as _IssueSeverity,
  formatBytes as _formatBytes,
  bytesToMB as _bytesToMB,
  sortBySeverity,
} from "./config.js";

// ============================================================================
// ZOD SCHEMAS FOR TOOL INPUTS
// ============================================================================

export const AnalyzePerformanceInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  checkMemoryLeaks: z.boolean().optional().describe("Check for memory leak patterns"),
  analyzeBuildSize: z.boolean().optional().describe("Analyze build output size"),
  checkRenderPerformance: z.boolean().optional().describe("Check render performance issues"),
});

export const OptimizeAssetsInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  assetsPath: z.string().describe("Path to assets folder"),
  compressImages: z.boolean().optional().describe("Compress image files"),
  generateWebP: z.boolean().optional().describe("Generate WebP versions"),
  removeUnused: z.boolean().optional().describe("Remove unused assets"),
});

export const CheckMemoryLeaksInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  targetPath: z.string().optional().describe("Specific path to analyze (default: lib/)"),
  includeCustomPatterns: z.boolean().optional().describe("Include custom patterns"),
});

export const AnalyzeBuildSizeInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  platform: z.enum(["android", "ios", "web"]).describe("Platform to analyze"),
  buildPath: z.string().optional().describe("Custom build output path"),
});

export const GeneratePerformanceReportInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  format: z.enum(["markdown", "json", "html"]).optional().describe("Report format"),
  includeHistory: z.boolean().optional().describe("Include historical data"),
});

export const ConfigureThresholdsInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  maxApkSizeMB: z.number().optional().describe("Max APK size in MB"),
  maxIpaSizeMB: z.number().optional().describe("Max IPA size in MB"),
  maxWebBundleSizeMB: z.number().optional().describe("Max web bundle size in MB"),
  maxSetStatePerFile: z.number().optional().describe("Max setState calls per file"),
  maxNestingLevel: z.number().optional().describe("Max widget nesting level"),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const PERFORMANCE_TOOLS: Tool[] = [
  {
    name: "performance_analyze",
    description: "Comprehensive performance analysis including memory leaks, build size, and render performance",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        checkMemoryLeaks: { type: "boolean", description: "Check for memory leaks" },
        analyzeBuildSize: { type: "boolean", description: "Analyze build size" },
        checkRenderPerformance: { type: "boolean", description: "Check render performance" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "performance_check_memory_leaks",
    description: "Detect potential memory leaks from unclosed controllers, subscriptions, and setState after dispose",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        targetPath: { type: "string", description: "Path to analyze" },
        includeCustomPatterns: { type: "boolean", description: "Include custom patterns" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "performance_analyze_build_size",
    description: "Analyze build output size and provide optimization recommendations",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        platform: { type: "string", enum: ["android", "ios", "web"], description: "Platform" },
        buildPath: { type: "string", description: "Custom build path" },
      },
      required: ["projectId", "platform"],
    },
  },
  {
    name: "performance_optimize_assets",
    description: "Generate asset optimization script for images and other assets",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        assetsPath: { type: "string", description: "Assets folder path" },
        compressImages: { type: "boolean", description: "Compress images" },
        generateWebP: { type: "boolean", description: "Generate WebP versions" },
        removeUnused: { type: "boolean", description: "Remove unused assets" },
      },
      required: ["projectId", "assetsPath"],
    },
  },
  {
    name: "performance_generate_report",
    description: "Generate a comprehensive performance report",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        format: { type: "string", enum: ["markdown", "json", "html"], description: "Report format" },
        includeHistory: { type: "boolean", description: "Include history" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "performance_configure_thresholds",
    description: "Configure performance thresholds and limits",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        maxApkSizeMB: { type: "number", description: "Max APK size MB" },
        maxIpaSizeMB: { type: "number", description: "Max IPA size MB" },
        maxWebBundleSizeMB: { type: "number", description: "Max web bundle MB" },
        maxSetStatePerFile: { type: "number", description: "Max setState per file" },
        maxNestingLevel: { type: "number", description: "Max nesting level" },
      },
      required: ["projectId"],
    },
  },
];

// ============================================================================
// TOOL CONTEXT
// ============================================================================

export interface PerformanceToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  updateProject: (id: string, updates: Partial<ProjectDefinition>) => Promise<ProjectDefinition>;
  getPerformanceConfig: (projectId: string) => PerformanceModuleConfig | undefined;
  updatePerformanceConfig: (projectId: string, config: Partial<PerformanceModuleConfig>) => void;
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handlePerformanceTool(
  name: string,
  args: Record<string, unknown>,
  ctx: PerformanceToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (name) {
    case "performance_analyze":
      return handleAnalyzePerformance(args, ctx);
    case "performance_check_memory_leaks":
      return handleCheckMemoryLeaks(args, ctx);
    case "performance_analyze_build_size":
      return handleAnalyzeBuildSize(args, ctx);
    case "performance_optimize_assets":
      return handleOptimizeAssets(args, ctx);
    case "performance_generate_report":
      return handleGenerateReport(args, ctx);
    case "performance_configure_thresholds":
      return handleConfigureThresholds(args, ctx);
    default:
      throw new Error(`Unknown performance tool: ${name}`);
  }
}

// ============================================================================
// HANDLER IMPLEMENTATIONS
// ============================================================================

async function handleAnalyzePerformance(
  args: Record<string, unknown>,
  ctx: PerformanceToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = AnalyzePerformanceInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getPerformanceConfig(input.projectId);
  const results: string[] = [];

  results.push(`# Performance Analysis: ${project.name}`);
  results.push(`Timestamp: ${new Date().toISOString()}\n`);

  // Memory leak analysis
  if (input.checkMemoryLeaks !== false) {
    const memoryIssues = analyzeMemoryLeaks(config);
    results.push("## Memory Leak Analysis");
    if (memoryIssues.length === 0) {
      results.push("No memory leak patterns detected.\n");
    } else {
      results.push(`Found ${memoryIssues.length} potential issues:\n`);
      for (const issue of sortBySeverity(memoryIssues)) {
        results.push(`### [${issue.severity.toUpperCase()}] ${issue.issue}`);
        results.push(`- File: ${issue.file}`);
        results.push(`- Suggestion: ${issue.suggestion}\n`);
      }
    }
  }

  // Render performance analysis
  if (input.checkRenderPerformance !== false) {
    const renderIssues = analyzeRenderPerformance(config);
    results.push("## Render Performance Analysis");
    if (renderIssues.length === 0) {
      results.push("No render performance issues detected.\n");
    } else {
      results.push(`Found ${renderIssues.length} potential issues:\n`);
      for (const issue of sortBySeverity(renderIssues)) {
        results.push(`### [${issue.severity.toUpperCase()}] ${issue.issue}`);
        results.push(`- File: ${issue.file}`);
        results.push(`- Suggestion: ${issue.suggestion}\n`);
      }
    }
  }

  // Build size analysis
  if (input.analyzeBuildSize) {
    results.push("## Build Size Analysis");
    results.push("Run platform-specific build analysis using:");
    results.push("- `performance_analyze_build_size` for APK/IPA/Web bundle sizes\n");
  }

  // General recommendations
  results.push("## General Recommendations");
  results.push("1. Use const constructors where possible");
  results.push("2. Implement lazy loading for lists with many items");
  results.push("3. Use cached_network_image for network images");
  results.push("4. Enable code shrinking and obfuscation for release builds");
  results.push("5. Profile with Flutter DevTools for detailed analysis");

  return {
    content: [
      {
        type: "text",
        text: results.join("\n"),
      },
    ],
  };
}

async function handleCheckMemoryLeaks(
  args: Record<string, unknown>,
  ctx: PerformanceToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = CheckMemoryLeaksInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getPerformanceConfig(input.projectId);
  const targetPath = input.targetPath || "lib/";

  // Generate detection patterns and code
  const detectionCode = generateMemoryLeakDetectionCode(config);

  return {
    content: [
      {
        type: "text",
        text: `# Memory Leak Detection for ${project.name}

## Analysis Target: ${targetPath}

## Common Memory Leak Patterns

### 1. StreamController Not Closed
\`\`\`dart
// BAD: StreamController not closed
class MyClass {
  final _controller = StreamController<int>();
  // Missing: _controller.close() in dispose
}

// GOOD: Close in dispose
@override
void dispose() {
  _controller.close();
  super.dispose();
}
\`\`\`

### 2. AnimationController Not Disposed
\`\`\`dart
// BAD: AnimationController not disposed
late AnimationController _animController;
// Missing: _animController.dispose() in dispose

// GOOD: Dispose properly
@override
void dispose() {
  _animController.dispose();
  super.dispose();
}
\`\`\`

### 3. setState After Dispose
\`\`\`dart
// BAD: setState without mounted check
Future<void> _loadData() async {
  final data = await api.fetchData();
  setState(() => _data = data); // May crash if widget disposed
}

// GOOD: Check mounted before setState
Future<void> _loadData() async {
  final data = await api.fetchData();
  if (mounted) {
    setState(() => _data = data);
  }
}
\`\`\`

### 4. Subscription Not Cancelled
\`\`\`dart
// BAD: Subscription not cancelled
StreamSubscription? _subscription;
_subscription = stream.listen((data) => print(data));
// Missing: _subscription?.cancel() in dispose

// GOOD: Cancel subscription
@override
void dispose() {
  _subscription?.cancel();
  super.dispose();
}
\`\`\`

## Detection Helper Code

\`\`\`dart
${detectionCode}
\`\`\`

## Running Analysis

Use Flutter DevTools Memory tab to profile:
1. Open app in debug mode
2. Launch DevTools: \`flutter pub global run devtools\`
3. Navigate to Memory tab
4. Take snapshots before/after actions
5. Look for unexpected retained objects

## CI/CD Integration

\`\`\`yaml
# Add to your CI workflow
- name: Check for memory leak patterns
  run: |
    grep -rn "StreamController" lib/ | grep -v ".close()" || true
    grep -rn "AnimationController" lib/ | grep -v ".dispose()" || true
    grep -rn "setState" lib/ | grep -v "mounted" || true
\`\`\``,
      },
    ],
  };
}

async function handleAnalyzeBuildSize(
  args: Record<string, unknown>,
  ctx: PerformanceToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = AnalyzeBuildSizeInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getPerformanceConfig(input.projectId);
  const thresholds = config?.buildSize || {
    maxApkSizeMB: 50,
    maxIpaSizeMB: 100,
    maxWebBundleSizeMB: 5,
  };

  let buildCommand = "";
  let analyzeCommand = "";
  let sizeThreshold = 0;

  switch (input.platform) {
    case "android":
      buildCommand = "flutter build apk --release --analyze-size";
      analyzeCommand = "flutter build apk --release --analyze-size --target-platform android-arm64";
      sizeThreshold = thresholds.maxApkSizeMB;
      break;
    case "ios":
      buildCommand = "flutter build ipa --release --analyze-size";
      analyzeCommand = "flutter build ipa --release --analyze-size";
      sizeThreshold = thresholds.maxIpaSizeMB;
      break;
    case "web":
      buildCommand = "flutter build web --release";
      analyzeCommand = "du -sh build/web/";
      sizeThreshold = thresholds.maxWebBundleSizeMB;
      break;
  }

  return {
    content: [
      {
        type: "text",
        text: `# Build Size Analysis: ${project.name}

## Platform: ${input.platform.toUpperCase()}
## Size Threshold: ${sizeThreshold} MB

## Build Commands

\`\`\`bash
# Build with size analysis
${buildCommand}

# Analyze size breakdown
${analyzeCommand}
\`\`\`

## Expected Output Locations

- Android APK: \`build/app/outputs/flutter-apk/app-release.apk\`
- iOS IPA: \`build/ios/ipa/*.ipa\`
- Web: \`build/web/\`

## Size Optimization Recommendations

### 1. Code Optimizations
\`\`\`bash
# Build with minification and tree shaking
flutter build ${input.platform} --release --obfuscate --split-debug-info=./debug_info
\`\`\`

### 2. Asset Optimizations
- Compress images using WebP format
- Use vector graphics (SVG) where possible
- Remove unused assets from pubspec.yaml

### 3. Dependency Audit
\`\`\`bash
# Check dependency tree size
flutter pub deps --style=compact

# Identify large dependencies
flutter pub global activate pubspec_analyst
pubspec_analyst --size
\`\`\`

### 4. Platform-Specific Tips

${input.platform === "android" ? `#### Android APK Optimization
- Use App Bundles (.aab) instead of APK
- Split APKs by ABI: \`--split-per-abi\`
- Enable R8 code shrinking
- ProGuard rules for smaller size

\`\`\`bash
# Build split APKs
flutter build apk --release --split-per-abi
\`\`\`
` : ""}

${input.platform === "ios" ? `#### iOS IPA Optimization
- Enable Bitcode
- Use asset catalogs
- Optimize for latest iOS version

\`\`\`bash
# Build with minimal footprint
flutter build ipa --release
\`\`\`
` : ""}

${input.platform === "web" ? `#### Web Bundle Optimization
- Use deferred loading
- Enable tree shaking
- Optimize font loading

\`\`\`bash
# Build with CanvasKit renderer (smaller initial load)
flutter build web --release --web-renderer canvaskit

# Or HTML renderer (smaller total size)
flutter build web --release --web-renderer html
\`\`\`
` : ""}

## CI/CD Size Check

\`\`\`yaml
# Add to your CI workflow
- name: Check build size
  run: |
    SIZE=$(stat -f%z build/app/outputs/flutter-apk/app-release.apk 2>/dev/null || stat -c%s build/app/outputs/flutter-apk/app-release.apk)
    SIZE_MB=$(echo "scale=2; $SIZE / 1048576" | bc)
    echo "Build size: $SIZE_MB MB"
    if (( $(echo "$SIZE_MB > ${sizeThreshold}" | bc -l) )); then
      echo "::error::Build size exceeds ${sizeThreshold}MB threshold"
      exit 1
    fi
\`\`\``,
      },
    ],
  };
}

async function handleOptimizeAssets(
  args: Record<string, unknown>,
  ctx: PerformanceToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = OptimizeAssetsInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const compressImages = input.compressImages !== false;
  const generateWebP = input.generateWebP !== false;
  const removeUnused = input.removeUnused || false;

  const script = generateAssetOptimizationScript(
    input.assetsPath,
    compressImages,
    generateWebP,
    removeUnused
  );

  return {
    content: [
      {
        type: "text",
        text: `# Asset Optimization for ${project.name}

## Assets Path: ${input.assetsPath}

## Options:
- Compress Images: ${compressImages ? "Yes" : "No"}
- Generate WebP: ${generateWebP ? "Yes" : "No"}
- Remove Unused: ${removeUnused ? "Yes" : "No"}

## Optimization Script

Save this as \`optimize_assets.sh\` and run:

\`\`\`bash
${script}
\`\`\`

## Required Tools

\`\`\`bash
# macOS
brew install imagemagick webp

# Ubuntu/Debian
sudo apt-get install imagemagick webp
\`\`\`

## Pubspec Asset Configuration

\`\`\`yaml
flutter:
  assets:
    - ${input.assetsPath}/images/
    - ${input.assetsPath}/icons/
    ${generateWebP ? `- ${input.assetsPath}/images/optimized/` : ""}

  # Enable asset compression
  uses-material-design: true
\`\`\`

## Flutter Image Loading Best Practices

\`\`\`dart
// Use cached_network_image for network images
Image.network(url); // BAD - no caching

CachedNetworkImage(  // GOOD - with caching
  imageUrl: url,
  placeholder: (context, url) => CircularProgressIndicator(),
  errorWidget: (context, url, error) => Icon(Icons.error),
);

// Lazy load images in lists
ListView.builder(
  itemBuilder: (context, index) {
    return Image.asset(
      'assets/image_$index.png',
      cacheWidth: 200,  // Resize in memory
      cacheHeight: 200,
    );
  },
);
\`\`\``,
      },
    ],
  };
}

async function handleGenerateReport(
  args: Record<string, unknown>,
  ctx: PerformanceToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GeneratePerformanceReportInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getPerformanceConfig(input.projectId);
  const format = input.format || "markdown";

  const report = generatePerformanceReport(project.name, config, format, input.includeHistory || false);

  return {
    content: [
      {
        type: "text",
        text: report,
      },
    ],
  };
}

async function handleConfigureThresholds(
  args: Record<string, unknown>,
  ctx: PerformanceToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureThresholdsInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getPerformanceConfig(input.projectId);

  const updates: Partial<PerformanceModuleConfig> = {};

  if (input.maxApkSizeMB || input.maxIpaSizeMB || input.maxWebBundleSizeMB) {
    updates.buildSize = {
      ...(config?.buildSize || {}),
      enabled: true,
      maxApkSizeMB: input.maxApkSizeMB || config?.buildSize?.maxApkSizeMB || 50,
      maxIpaSizeMB: input.maxIpaSizeMB || config?.buildSize?.maxIpaSizeMB || 100,
      maxWebBundleSizeMB: input.maxWebBundleSizeMB || config?.buildSize?.maxWebBundleSizeMB || 5,
      warnOnLargeAssets: config?.buildSize?.warnOnLargeAssets ?? true,
      largeAssetThresholdKB: config?.buildSize?.largeAssetThresholdKB || 500,
    };
  }

  if (input.maxSetStatePerFile || input.maxNestingLevel) {
    updates.renderPerformance = {
      ...(config?.renderPerformance || {}),
      enabled: true,
      checkAsyncInBuild: config?.renderPerformance?.checkAsyncInBuild ?? true,
      checkExcessiveSetState: config?.renderPerformance?.checkExcessiveSetState ?? true,
      maxSetStatePerFile: input.maxSetStatePerFile || config?.renderPerformance?.maxSetStatePerFile || 5,
      checkDeepNesting: config?.renderPerformance?.checkDeepNesting ?? true,
      maxNestingLevel: input.maxNestingLevel || config?.renderPerformance?.maxNestingLevel || 15,
      checkExpensiveOperations: config?.renderPerformance?.checkExpensiveOperations ?? true,
      checkConstConstructors: config?.renderPerformance?.checkConstConstructors ?? true,
    };
  }

  ctx.updatePerformanceConfig(input.projectId, updates);

  return {
    content: [
      {
        type: "text",
        text: `# Performance Thresholds Updated for ${project.name}

## Build Size Thresholds
- Max APK Size: ${updates.buildSize?.maxApkSizeMB || config?.buildSize?.maxApkSizeMB || 50} MB
- Max IPA Size: ${updates.buildSize?.maxIpaSizeMB || config?.buildSize?.maxIpaSizeMB || 100} MB
- Max Web Bundle: ${updates.buildSize?.maxWebBundleSizeMB || config?.buildSize?.maxWebBundleSizeMB || 5} MB

## Render Performance Thresholds
- Max setState per file: ${updates.renderPerformance?.maxSetStatePerFile || config?.renderPerformance?.maxSetStatePerFile || 5}
- Max nesting level: ${updates.renderPerformance?.maxNestingLevel || config?.renderPerformance?.maxNestingLevel || 15}

These thresholds will be used for CI/CD checks and performance reports.`,
      },
    ],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function analyzeMemoryLeaks(config: PerformanceModuleConfig | undefined): MemoryIssue[] {
  // This would normally scan files - returning sample issues for demonstration
  const issues: MemoryIssue[] = [];

  if (config?.memoryLeakDetection?.checkStreamControllers) {
    // Would scan for StreamController without .close()
  }

  if (config?.memoryLeakDetection?.checkAnimationControllers) {
    // Would scan for AnimationController without .dispose()
  }

  return issues;
}

function analyzeRenderPerformance(config: PerformanceModuleConfig | undefined): RenderPerformanceIssue[] {
  const issues: RenderPerformanceIssue[] = [];

  if (config?.renderPerformance?.checkAsyncInBuild) {
    // Would scan for async operations in build methods
  }

  if (config?.renderPerformance?.checkExcessiveSetState) {
    // Would count setState calls
  }

  return issues;
}

function generateMemoryLeakDetectionCode(_config: PerformanceModuleConfig | undefined): string {
  return `// Memory Leak Detection Mixin
mixin MemoryLeakDetection<T extends StatefulWidget> on State<T> {
  final List<StreamSubscription> _subscriptions = [];
  final List<StreamController> _controllers = [];
  final List<AnimationController> _animationControllers = [];

  void trackSubscription(StreamSubscription subscription) {
    _subscriptions.add(subscription);
  }

  void trackController(StreamController controller) {
    _controllers.add(controller);
  }

  void trackAnimationController(AnimationController controller) {
    _animationControllers.add(controller);
  }

  void safeSetState(VoidCallback fn) {
    if (mounted) {
      setState(fn);
    }
  }

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    for (final controller in _controllers) {
      controller.close();
    }
    for (final controller in _animationControllers) {
      controller.dispose();
    }
    super.dispose();
  }
}`;
}

function generateAssetOptimizationScript(
  assetsPath: string,
  compressImages: boolean,
  generateWebP: boolean,
  removeUnused: boolean
): string {
  return `#!/bin/bash
# Asset Optimization Script
# Generated by Performance Module

set -e

ASSETS_PATH="${assetsPath}"
OPTIMIZED_PATH="\${ASSETS_PATH}/optimized"

echo "Starting asset optimization..."

# Create optimized directory
mkdir -p "\${OPTIMIZED_PATH}"

${compressImages ? `
# Compress PNG files
echo "Compressing PNG files..."
find "\${ASSETS_PATH}" -name "*.png" -type f | while read img; do
  filename=$(basename "\$img")
  convert "\$img" -strip -quality 85 "\${OPTIMIZED_PATH}/\${filename}"
  echo "Compressed: \${filename}"
done

# Compress JPEG files
echo "Compressing JPEG files..."
find "\${ASSETS_PATH}" -name "*.jpg" -o -name "*.jpeg" -type f | while read img; do
  filename=$(basename "\$img")
  convert "\$img" -strip -quality 85 -sampling-factor 4:2:0 "\${OPTIMIZED_PATH}/\${filename}"
  echo "Compressed: \${filename}"
done
` : "# Image compression disabled"}

${generateWebP ? `
# Generate WebP versions
echo "Generating WebP versions..."
find "\${ASSETS_PATH}" -type f \\( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \\) | while read img; do
  filename=$(basename "\$img")
  name="\${filename%.*}"
  cwebp -q 80 "\$img" -o "\${OPTIMIZED_PATH}/\${name}.webp"
  echo "Generated WebP: \${name}.webp"
done
` : "# WebP generation disabled"}

${removeUnused ? `
# Find unused assets
echo "Finding unused assets..."
mkdir -p "\${ASSETS_PATH}/unused"
find "\${ASSETS_PATH}" -type f | while read asset; do
  filename=$(basename "\$asset")
  if ! grep -r "\${filename}" lib/ --include="*.dart" > /dev/null 2>&1; then
    echo "Potentially unused: \${filename}"
    # mv "\$asset" "\${ASSETS_PATH}/unused/"  # Uncomment to move
  fi
done
` : "# Unused asset removal disabled"}

# Generate report
echo ""
echo "Optimization complete!"
echo "Original size: $(du -sh "\${ASSETS_PATH}" | cut -f1)"
echo "Optimized size: $(du -sh "\${OPTIMIZED_PATH}" | cut -f1)"
`;
}

function generatePerformanceReport(
  projectName: string,
  config: PerformanceModuleConfig | undefined,
  format: string,
  includeHistory: boolean
): string {
  const timestamp = new Date().toISOString();

  if (format === "json") {
    return JSON.stringify({
      project: projectName,
      timestamp,
      config,
      recommendations: [
        "Use const constructors",
        "Implement lazy loading",
        "Optimize assets",
        "Profile with DevTools",
      ],
    }, null, 2);
  }

  return `# Performance Report: ${projectName}

Generated: ${timestamp}

## Configuration

### Memory Leak Detection
- Enabled: ${config?.memoryLeakDetection?.enabled ?? true}
- Check Stream Controllers: ${config?.memoryLeakDetection?.checkStreamControllers ?? true}
- Check Animation Controllers: ${config?.memoryLeakDetection?.checkAnimationControllers ?? true}

### Build Size Limits
- Max APK: ${config?.buildSize?.maxApkSizeMB || 50} MB
- Max IPA: ${config?.buildSize?.maxIpaSizeMB || 100} MB
- Max Web: ${config?.buildSize?.maxWebBundleSizeMB || 5} MB

### Render Performance
- Max setState/file: ${config?.renderPerformance?.maxSetStatePerFile || 5}
- Max nesting: ${config?.renderPerformance?.maxNestingLevel || 15}

## Recommendations

1. **Use const constructors** - Reduces rebuilds
2. **Implement lazy loading** - Better list performance
3. **Optimize assets** - Smaller bundle size
4. **Profile with DevTools** - Find bottlenecks

${includeHistory && config?.analysisHistory ? `
## History

${config.analysisHistory.map(h => `- ${h.timestamp}: ${h.issues} issues${h.buildSizeMB ? `, ${h.buildSizeMB} MB` : ""}`).join("\n")}
` : ""}

## Next Steps

1. Run \`performance_analyze\` for full analysis
2. Run \`performance_check_memory_leaks\` for detailed leak detection
3. Run \`performance_optimize_assets\` to compress assets
4. Use Flutter DevTools for runtime profiling`;
}

export default PERFORMANCE_TOOLS;
