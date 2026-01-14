/**
 * Glass Bottom Sheet Component Template
 *
 * Glassmorphic bottom sheet with BackdropFilter blur and slide-up animation.
 *
 * Features:
 * - BackdropFilter blur effect
 * - Adaptive theming (light/dark mode)
 * - Rounded top corners
 * - Customizable border
 * - Drag-to-dismiss support (when used with showModalBottomSheet)
 *
 * Source: EDC Design System (edc-web)
 * Flutter: 3.29+ compatible
 */

import type { Template } from "../../../core/types.js";

// ============================================================================
// HANDLEBARS TEMPLATE SOURCE
// ============================================================================

export const GLASS_BOTTOMSHEET_SOURCE = `import 'dart:ui';
import 'package:flutter/material.dart';

/// Glass bottom sheet component with BackdropFilter blur
///
/// Features:
/// - BackdropFilter blur effect
/// - Adaptive theming (light/dark mode)
/// - Rounded top corners only
/// - Customizable border radius and blur
/// - Works with showModalBottomSheet for drag-to-dismiss
///
/// Usage:
/// \\\`\\\`\\\`dart
/// showModalBottomSheet(
///   context: context,
///   backgroundColor: Colors.transparent,
///   builder: (context) => GlassBottomSheet(
///     child: Padding(
///       padding: EdgeInsets.all(20),
///       child: Column(
///         mainAxisSize: MainAxisSize.min,
///         children: [
///           Text('Bottom Sheet Title'),
///           SizedBox(height: 16),
///           Text('Bottom Sheet Content'),
///         ],
///       ),
///     ),
///   ),
/// );
/// \\\`\\\`\\\`
class GlassBottomSheet extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final double blurSigma;
  final Color? borderColor;
  final double borderWidth;

  const GlassBottomSheet({
    super.key,
    required this.child,
    this.borderRadius = {{defaultBorderRadius}},
    this.blurSigma = {{defaultBlurStrength}},
    this.borderColor,
    this.borderWidth = {{defaultBorderWidth}},
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ClipRRect(
      borderRadius: BorderRadius.vertical(top: Radius.circular(borderRadius)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.vertical(top: Radius.circular(borderRadius)),
            color: isDark
                ? Colors.black.withValues(alpha: {{darkModeAlpha}})
                : Colors.white.withValues(alpha: {{lightModeAlpha}}),
            border: Border.all(
              color: borderColor ?? (isDark ? Colors.white24 : Colors.white54),
              width: borderWidth,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Helper function to show a glass bottom sheet with proper configuration
///
/// Usage:
/// \\\`\\\`\\\`dart
/// showGlassBottomSheet(
///   context: context,
///   child: MyBottomSheetContent(),
/// );
/// \\\`\\\`\\\`
Future<T?> showGlassBottomSheet<T>({
  required BuildContext context,
  required Widget child,
  double borderRadius = {{defaultBorderRadius}},
  double blurSigma = {{defaultBlurStrength}},
  bool isDismissible = true,
  bool enableDrag = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    backgroundColor: Colors.transparent,
    isDismissible: isDismissible,
    enableDrag: enableDrag,
    isScrollControlled: true,
    builder: (context) => GlassBottomSheet(
      borderRadius: borderRadius,
      blurSigma: blurSigma,
      child: child,
    ),
  );
}
`;

// ============================================================================
// DEFAULT VALUES FOR HANDLEBARS CONTEXT
// ============================================================================

export interface GlassBottomSheetConfig {
  defaultBorderRadius: number;
  defaultBlurStrength: number;
  defaultBorderWidth: number;
  darkModeAlpha: number;
  lightModeAlpha: number;
}

export const DEFAULT_GLASS_BOTTOMSHEET_CONFIG: GlassBottomSheetConfig = {
  defaultBorderRadius: 24.0,
  defaultBlurStrength: 40.0,
  defaultBorderWidth: 1.5,
  darkModeAlpha: 0.85,
  lightModeAlpha: 0.95,
};

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================

export const GLASS_BOTTOMSHEET_TEMPLATE: Template = {
  id: "design-glass-bottomsheet",
  name: "Glass Bottom Sheet Component",
  description: "Glassmorphic bottom sheet with BackdropFilter blur and helper function",
  type: "file",
  source: GLASS_BOTTOMSHEET_SOURCE,
  output: {
    path: "lib/widgets",
    filename: "glass_bottomsheet",
    extension: "dart",
  },
};

export default GLASS_BOTTOMSHEET_TEMPLATE;
