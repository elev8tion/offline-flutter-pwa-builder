/**
 * Design Module Templates Index
 *
 * Exports all EDC design system templates:
 * - Design Tokens (AppSpacing, AppColors, AppRadius, AppBorders, AppAnimations, AppSizes, AppBlur)
 * - Glass Gradients (4-level glass system, status gradients, helpers)
 * - WCAG Contrast Calculator (accessibility compliance checking)
 */

// ============================================================================
// TEMPLATE EXPORTS
// ============================================================================

export {
  DESIGN_TOKENS_TEMPLATE,
  DESIGN_TOKENS_SOURCE,
  DEFAULT_DESIGN_TOKENS_CONFIG,
  type DesignTokensConfig,
} from "./design_tokens_template.js";

export {
  GLASS_GRADIENTS_TEMPLATE,
  GLASS_GRADIENTS_SOURCE,
  DEFAULT_GLASS_GRADIENTS_CONFIG,
  alphaToHex,
  extractHexColor,
  type GlassGradientsConfig,
} from "./glass_gradients_template.js";

export {
  WCAG_CONTRAST_TEMPLATE,
  WCAG_CONTRAST_SOURCE,
  DEFAULT_WCAG_CONTRAST_CONFIG,
  relativeLuminance,
  wcagContrastRatio,
  meetsWcagAA,
  meetsWcagAALarge,
  meetsWcagAAA,
  getWcagContrastReport,
  getDetailedWcagReport,
  type WCAGContrastConfig,
} from "./wcag_contrast_template.js";

export {
  GLASS_CARD_TEMPLATE,
  GLASS_CONTAINER_TEMPLATE,
  GLASS_CARD_SOURCE,
  GLASS_CONTAINER_SOURCE,
  DEFAULT_GLASS_CARD_CONFIG,
  DEFAULT_GLASS_CONTAINER_CONFIG,
  type GlassCardConfig,
  type GlassContainerConfig,
} from "./glass_card_template.js";

export {
  GLASS_BUTTON_TEMPLATE,
  GLASS_BUTTON_SOURCE,
  DEFAULT_GLASS_BUTTON_CONFIG,
  type GlassButtonConfig,
} from "./glass_button_template.js";

export {
  GLASS_BOTTOMSHEET_TEMPLATE,
  GLASS_BOTTOMSHEET_SOURCE,
  DEFAULT_GLASS_BOTTOMSHEET_CONFIG,
  type GlassBottomSheetConfig,
} from "./glass_bottomsheet_template.js";

// ============================================================================
// ALL TEMPLATES ARRAY
// ============================================================================

import { DESIGN_TOKENS_TEMPLATE } from "./design_tokens_template.js";
import { GLASS_GRADIENTS_TEMPLATE } from "./glass_gradients_template.js";
import { WCAG_CONTRAST_TEMPLATE } from "./wcag_contrast_template.js";
import { GLASS_CARD_TEMPLATE, GLASS_CONTAINER_TEMPLATE } from "./glass_card_template.js";
import { GLASS_BUTTON_TEMPLATE } from "./glass_button_template.js";
import { GLASS_BOTTOMSHEET_TEMPLATE } from "./glass_bottomsheet_template.js";

/**
 * All EDC design system templates
 */
export const EDC_DESIGN_TEMPLATES = [
  DESIGN_TOKENS_TEMPLATE,
  GLASS_GRADIENTS_TEMPLATE,
  WCAG_CONTRAST_TEMPLATE,
  GLASS_CARD_TEMPLATE,
  GLASS_CONTAINER_TEMPLATE,
  GLASS_BUTTON_TEMPLATE,
  GLASS_BOTTOMSHEET_TEMPLATE,
];

export default EDC_DESIGN_TEMPLATES;
