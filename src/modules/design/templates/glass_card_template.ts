/**
 * Glass Card Component Templates
 *
 * Production-ready glassmorphic card components with BackdropFilter blur,
 * dual shadows, noise overlay, and light simulation.
 *
 * Components:
 * - GlassCard: Simple glass card with blur and border
 * - GlassContainer: Advanced glass container with full visual enhancements
 *
 * Source: EDC Design System (edc-web)
 * Flutter: 3.29+ compatible
 */

import type { Template } from "../../../core/types.js";

// ============================================================================
// HANDLEBARS TEMPLATE SOURCE - GLASS CARD
// ============================================================================

export const GLASS_CARD_SOURCE = `import 'dart:ui';
import 'package:flutter/material.dart';

/// Simple glass card component with BackdropFilter blur and customizable border
///
/// Features:
/// - BackdropFilter blur effect
/// - Adaptive theming (light/dark mode)
/// - Customizable border radius and blur strength
/// - Optional width/height constraints
/// - Configurable padding and margin
///
/// Usage:
/// \\\`\\\`\\\`dart
/// GlassCard(
///   borderRadius: 24,
///   blurSigma: 40,
///   child: Text('Hello World'),
/// )
/// \\\`\\\`\\\`
class GlassCard extends StatelessWidget {
  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final double blurSigma;
  final Color? borderColor;
  final double borderWidth;

  const GlassCard({
    super.key,
    required this.child,
    this.width,
    this.height,
    this.margin,
    this.padding = const EdgeInsets.all({{defaultPadding}}),
    this.borderRadius = {{defaultBorderRadius}},
    this.blurSigma = {{defaultBlurStrength}},
    this.borderColor,
    this.borderWidth = {{defaultBorderWidth}},
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: width,
      height: height,
      margin: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(borderRadius),
              color: isDark
                ? Colors.white.withValues(alpha: {{darkModeAlpha}})
                : Colors.white.withValues(alpha: {{lightModeAlpha}}),
              border: Border.all(
                color: borderColor ?? (isDark ? Colors.white24 : Colors.white54),
                width: borderWidth,
              ),
            ),
            padding: padding,
            child: child,
          ),
        ),
      ),
    );
  }
}
`;

// ============================================================================
// HANDLEBARS TEMPLATE SOURCE - GLASS CONTAINER
// ============================================================================

export const GLASS_CONTAINER_SOURCE = `import 'dart:ui';
import 'package:flutter/material.dart';
{{#if includeNoiseOverlay}}
import 'package:{{projectName}}/widgets/noise_overlay.dart';
{{/if}}

/// Advanced glass container with full visual enhancements
///
/// Features:
/// - BackdropFilter blur effect
/// - Dual shadow technique (ambient + definition)
/// - Optional noise overlay for texture
/// - Optional light simulation gradient
/// - Customizable gradient colors and stops
/// - Custom border support
/// - Static cached values for performance
///
/// Usage:
/// \\\`\\\`\\\`dart
/// GlassContainer(
///   borderRadius: 24,
///   blurStrength: 40,
///   enableNoise: true,
///   enableLightSimulation: true,
///   child: Column(
///     children: [
///       Text('Title'),
///       Text('Content'),
///     ],
///   ),
/// )
/// \\\`\\\`\\\`
class GlassContainer extends StatelessWidget {
  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final double blurStrength;
  final List<Color>? gradientColors;
  final List<double>? gradientStops;
  final Border? border;
  final bool enableNoise;
  final bool enableLightSimulation;

  const GlassContainer({
    super.key,
    required this.child,
    this.width,
    this.height,
    this.margin,
    this.padding = const EdgeInsets.all({{defaultPadding}}),
    this.borderRadius = {{defaultBorderRadius}},
    this.blurStrength = {{defaultBlurStrength}},
    this.gradientColors,
    this.gradientStops,
    this.border,
    this.enableNoise = {{enableNoiseByDefault}},
    this.enableLightSimulation = {{enableLightSimulationByDefault}},
  });

  // Static cached values - avoids recalculating on every build
  static final List<Color> _defaultGradientColors = [
    Colors.white.withValues(alpha: {{gradientStartAlpha}}),
    Colors.white.withValues(alpha: {{gradientEndAlpha}}),
  ];

  static final Color _defaultBorderColor = Colors.white.withValues(alpha: {{borderAlpha}});

  static final List<BoxShadow> _defaultBoxShadows = [
    // Ambient shadow (far, soft)
    BoxShadow(
      color: Colors.black.withValues(alpha: {{ambientShadowAlpha}}),
      offset: const Offset({{ambientShadowOffsetX}}, {{ambientShadowOffsetY}}),
      blurRadius: {{ambientShadowBlur}},
      spreadRadius: {{ambientShadowSpread}},
    ),
    // Definition shadow (close, sharp)
    BoxShadow(
      color: Colors.black.withValues(alpha: {{definitionShadowAlpha}}),
      offset: const Offset({{definitionShadowOffsetX}}, {{definitionShadowOffsetY}}),
      blurRadius: {{definitionShadowBlur}},
      spreadRadius: {{definitionShadowSpread}},
    ),
  ];

  static final Color _lightSimulationColor = Colors.white.withValues(alpha: {{lightSimulationAlpha}});

  @override
  Widget build(BuildContext context) {
    Widget content = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurStrength, sigmaY: blurStrength),
        child: Padding(
          padding: padding ?? EdgeInsets.zero,
          child: child,
        ),
      ),
    );

    // Add noise overlay if enabled
    if (enableNoise) {
      content = ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: StaticNoiseOverlay(
          opacity: {{noiseOpacity}},
          density: {{noiseDensity}},
          child: content,
        ),
      );
    }

    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors ?? _defaultGradientColors,
          stops: gradientStops ?? const [0.0, 1.0],
          begin: const AlignmentDirectional(0.98, -1.0),
          end: const AlignmentDirectional(-0.98, 1.0),
        ),
        borderRadius: BorderRadius.circular(borderRadius),
        border: border ?? Border.all(
          color: _defaultBorderColor,
          width: {{defaultBorderWidth}},
        ),
        boxShadow: _defaultBoxShadows,
      ),
      // Light simulation via foreground decoration
      foregroundDecoration: enableLightSimulation
          ? BoxDecoration(
              borderRadius: BorderRadius.circular(borderRadius),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: const [0.0, 0.5],
                colors: [
                  _lightSimulationColor,
                  Colors.transparent,
                ],
              ),
            )
          : null,
      child: content,
    );
  }
}
`;

// ============================================================================
// DEFAULT VALUES FOR HANDLEBARS CONTEXT
// ============================================================================

export interface GlassCardConfig {
  defaultPadding: number;
  defaultBorderRadius: number;
  defaultBlurStrength: number;
  defaultBorderWidth: number;
  darkModeAlpha: number;
  lightModeAlpha: number;
}

export interface GlassContainerConfig {
  projectName?: string;
  includeNoiseOverlay: boolean;
  defaultPadding: number;
  defaultBorderRadius: number;
  defaultBlurStrength: number;
  defaultBorderWidth: number;
  enableNoiseByDefault: boolean;
  enableLightSimulationByDefault: boolean;
  gradientStartAlpha: number;
  gradientEndAlpha: number;
  borderAlpha: number;
  ambientShadowAlpha: number;
  ambientShadowOffsetX: number;
  ambientShadowOffsetY: number;
  ambientShadowBlur: number;
  ambientShadowSpread: number;
  definitionShadowAlpha: number;
  definitionShadowOffsetX: number;
  definitionShadowOffsetY: number;
  definitionShadowBlur: number;
  definitionShadowSpread: number;
  lightSimulationAlpha: number;
  noiseOpacity: number;
  noiseDensity: number;
}

export const DEFAULT_GLASS_CARD_CONFIG: GlassCardConfig = {
  defaultPadding: 16.0,
  defaultBorderRadius: 24.0,
  defaultBlurStrength: 40.0,
  defaultBorderWidth: 1.5,
  darkModeAlpha: 0.15,
  lightModeAlpha: 0.25,
};

export const DEFAULT_GLASS_CONTAINER_CONFIG: GlassContainerConfig = {
  projectName: "myapp",
  includeNoiseOverlay: false,
  defaultPadding: 16.0,
  defaultBorderRadius: 24.0,
  defaultBlurStrength: 40.0,
  defaultBorderWidth: 1.5,
  enableNoiseByDefault: false,
  enableLightSimulationByDefault: true,
  gradientStartAlpha: 0.15,
  gradientEndAlpha: 0.08,
  borderAlpha: 0.2,
  ambientShadowAlpha: 0.1,
  ambientShadowOffsetX: 0,
  ambientShadowOffsetY: 8,
  ambientShadowBlur: 24,
  ambientShadowSpread: 0,
  definitionShadowAlpha: 0.15,
  definitionShadowOffsetX: 0,
  definitionShadowOffsetY: 2,
  definitionShadowBlur: 4,
  definitionShadowSpread: 0,
  lightSimulationAlpha: 0.1,
  noiseOpacity: 0.15,
  noiseDensity: 0.5,
};

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const GLASS_CARD_TEMPLATE: Template = {
  id: "design-glass-card",
  name: "Glass Card Component",
  description: "Simple glass card with BackdropFilter blur and customizable border",
  type: "file",
  source: GLASS_CARD_SOURCE,
  output: {
    path: "lib/widgets",
    filename: "glass_card",
    extension: "dart",
  },
};

export const GLASS_CONTAINER_TEMPLATE: Template = {
  id: "design-glass-container",
  name: "Glass Container Component",
  description: "Advanced glass container with dual shadows, noise overlay, and light simulation",
  type: "file",
  source: GLASS_CONTAINER_SOURCE,
  output: {
    path: "lib/widgets",
    filename: "glass_container",
    extension: "dart",
  },
};

export default GLASS_CARD_TEMPLATE;
