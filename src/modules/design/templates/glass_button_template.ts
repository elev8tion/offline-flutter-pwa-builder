/**
 * Glass Button Component Template
 *
 * Interactive glassmorphic button with press animations, haptic feedback,
 * and full visual enhancements (BackdropFilter, dual shadows, noise, light simulation).
 *
 * Features:
 * - 80ms press animation (0.95 scale)
 * - Haptic feedback (light/medium/heavy)
 * - BackdropFilter blur
 * - Dual shadow technique
 * - Optional noise overlay
 * - Optional light simulation
 * - Loading state support
 *
 * Source: EDC Design System (edc-web)
 * Flutter: 3.29+ compatible
 */

import type { Template } from "../../../core/types.js";

// ============================================================================
// HANDLEBARS TEMPLATE SOURCE
// ============================================================================

export const GLASS_BUTTON_SOURCE = `import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
{{#if includeAutoSize}}
import 'package:auto_size_text/auto_size_text.dart';
{{/if}}
{{#if includeNoiseOverlay}}
import 'package:{{projectName}}/widgets/noise_overlay.dart';
{{/if}}

/// Haptic feedback type enum
enum HapticFeedbackType {
  light,
  medium,
  heavy,
}

/// Enhanced GlassButton with realistic glass surface and press animations
///
/// Visual Enhancements:
/// - BackdropFilter for proper glass blur
/// - Dual-shadow technique (ambient + definition)
/// - Static noise overlay for texture authenticity
/// - Light simulation via foreground gradient
///
/// Interactive Features:
/// - Press animation (scale {{pressScale}} default)
/// - Haptic feedback on press (medium impact default)
/// - Loading state with spinner
/// - Does not block touch events
///
/// Usage:
/// \\\`\\\`\\\`dart
/// GlassButton(
///   text: 'Click Me',
///   onPressed: () => print('Pressed!'),
///   enablePressAnimation: true,
///   enableHaptics: true,
/// )
/// \\\`\\\`\\\`
class GlassButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final double? width;
  final double height;
  final Widget? loadingWidget;
  final Color? borderColor;

  // Animation parameters
  final bool enablePressAnimation;
  final double pressScale;
  final bool enableHaptics;
  final HapticFeedbackType hapticType;

  // Visual enhancement parameters
  final double blurStrength;
  final bool enableNoise;
  final bool enableLightSimulation;

  const GlassButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.width,
    this.height = {{defaultHeight}},
    this.loadingWidget,
    this.borderColor,
    this.enablePressAnimation = {{enablePressAnimationByDefault}},
    this.pressScale = {{pressScale}},
    this.enableHaptics = {{enableHapticsByDefault}},
    this.hapticType = HapticFeedbackType.{{defaultHapticType}},
    this.blurStrength = {{defaultBlurStrength}},
    this.enableNoise = {{enableNoiseByDefault}},
    this.enableLightSimulation = {{enableLightSimulationByDefault}},
  });

  @override
  State<GlassButton> createState() => _GlassButtonState();
}

class _GlassButtonState extends State<GlassButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    // Initialize animation controller with fast duration (< 100ms for visual feedback)
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: {{animationDuration}}),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: widget.pressScale,
    ).animate(
      CurvedAnimation(
        parent: _scaleController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    // REQUIRED: Dispose animation controller to prevent memory leaks
    _scaleController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    if (!widget.isLoading && widget.onPressed != null && widget.enablePressAnimation) {
      _scaleController.forward();
    }
  }

  void _handleTapUp(TapUpDetails details) {
    if (widget.enablePressAnimation) {
      _scaleController.reverse();
    }
  }

  void _handleTapCancel() {
    if (widget.enablePressAnimation) {
      _scaleController.reverse();
    }
  }

  void _handleTap() {
    // Haptic feedback BEFORE calling onPressed (Rule: provide feedback within 100ms)
    if (widget.enableHaptics && widget.onPressed != null) {
      switch (widget.hapticType) {
        case HapticFeedbackType.light:
          HapticFeedback.lightImpact();
          break;
        case HapticFeedbackType.medium:
          HapticFeedback.mediumImpact();
          break;
        case HapticFeedbackType.heavy:
          HapticFeedback.heavyImpact();
          break;
      }
    }

    // Call original onPressed
    widget.onPressed?.call();
  }

  @override
  Widget build(BuildContext context) {
    final responsiveHeight = widget.height;
    final responsiveBorderRadius = {{defaultBorderRadius}}.0;

    // Build button content
    Widget buttonContent = Center(
      child: widget.isLoading
          ? (widget.loadingWidget ?? SizedBox(
              height: 20,
              width: 20,
              child: const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                strokeWidth: 2,
              ),
            ))
          : Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: {{#if includeAutoSize}}AutoSizeText{{else}}Text{{/if}}(
                widget.text,
                style: const TextStyle(
                  fontSize: {{fontSize}},
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
                {{#if includeAutoSize}}
                maxLines: 1,
                minFontSize: 10,
                overflow: TextOverflow.ellipsis,
                {{/if}}
                textAlign: TextAlign.center,
              ),
            ),
    );

    // Build glass content with BackdropFilter blur
    Widget glassContent = ClipRRect(
      borderRadius: BorderRadius.circular(responsiveBorderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: widget.blurStrength,
          sigmaY: widget.blurStrength,
        ),
        child: Container(
          height: responsiveHeight,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(responsiveBorderRadius),
            color: Colors.black.withValues(alpha: {{backgroundAlpha}}),
            border: Border.all(
              color: widget.borderColor ?? const Color({{borderColor}}),
              width: {{borderWidth}},
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: null, // Handled by GestureDetector
              borderRadius: BorderRadius.circular(responsiveBorderRadius),
              child: buttonContent,
            ),
          ),
        ),
      ),
    );

    // Add noise overlay if enabled
    if (widget.enableNoise) {
      glassContent = ClipRRect(
        borderRadius: BorderRadius.circular(responsiveBorderRadius),
        child: StaticNoiseOverlay(
          opacity: {{noiseOpacity}},
          density: {{noiseDensity}},
          child: glassContent,
        ),
      );
    }

    // Wrap with container for dual shadows and light simulation
    Widget enhancedGlass = Container(
      width: widget.width ?? double.infinity,
      height: responsiveHeight,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(responsiveBorderRadius),
        // Enhanced dual shadows for realistic depth
        boxShadow: [
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
        ],
      ),
      // Light simulation via foreground decoration
      foregroundDecoration: widget.enableLightSimulation
          ? BoxDecoration(
              borderRadius: BorderRadius.circular(responsiveBorderRadius),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: const [0.0, 0.5],
                colors: [
                  Colors.white.withValues(alpha: {{lightSimulationAlpha}}),
                  Colors.transparent,
                ],
              ),
            )
          : null,
      child: glassContent,
    );

    // Wrap with GestureDetector and ScaleTransition for press animation
    return ScaleTransition(
      scale: _scaleAnimation,
      child: GestureDetector(
        onTapDown: _handleTapDown,
        onTapUp: _handleTapUp,
        onTapCancel: _handleTapCancel,
        onTap: widget.isLoading ? null : _handleTap,
        child: enhancedGlass,
      ),
    );
  }
}
`;

// ============================================================================
// DEFAULT VALUES FOR HANDLEBARS CONTEXT
// ============================================================================

export interface GlassButtonConfig {
  projectName?: string;
  includeAutoSize: boolean;
  includeNoiseOverlay: boolean;
  defaultHeight: number;
  enablePressAnimationByDefault: boolean;
  pressScale: number;
  enableHapticsByDefault: boolean;
  defaultHapticType: "light" | "medium" | "heavy";
  defaultBlurStrength: number;
  enableNoiseByDefault: boolean;
  enableLightSimulationByDefault: boolean;
  animationDuration: number;
  defaultBorderRadius: number;
  fontSize: number;
  backgroundAlpha: number;
  borderColor: string;
  borderWidth: number;
  noiseOpacity: number;
  noiseDensity: number;
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
}

export const DEFAULT_GLASS_BUTTON_CONFIG: GlassButtonConfig = {
  projectName: "myapp",
  includeAutoSize: false,
  includeNoiseOverlay: false,
  defaultHeight: 56.0,
  enablePressAnimationByDefault: true,
  pressScale: 0.95,
  enableHapticsByDefault: true,
  defaultHapticType: "medium",
  defaultBlurStrength: 40.0,
  enableNoiseByDefault: false,
  enableLightSimulationByDefault: true,
  animationDuration: 80,
  defaultBorderRadius: 28,
  fontSize: 16.0,
  backgroundAlpha: 0.2,
  borderColor: "0xFFD4AF37",
  borderWidth: 1.5,
  noiseOpacity: 0.15,
  noiseDensity: 0.5,
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
};

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================

export const GLASS_BUTTON_TEMPLATE: Template = {
  id: "design-glass-button",
  name: "Glass Button Component",
  description: "Interactive glass button with press animations, haptic feedback, and full visual enhancements",
  type: "file",
  source: GLASS_BUTTON_SOURCE,
  output: {
    path: "lib/widgets",
    filename: "glass_button",
    extension: "dart",
  },
};

export default GLASS_BUTTON_TEMPLATE;
