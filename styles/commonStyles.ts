
import { StyleSheet } from 'react-native';

// PhotoForge Color Palette
export const colors = {
  // Primary Colors
  primary: '#c87941',           // Main brand color, buttons, highlights
  primaryDark: '#8b5a2b',       // Darker shade for gradients
  
  // Background Colors
  backgroundLight: '#f5f1e8',   // Main background color
  backgroundWarm: '#d4c4a8',    // Navigation, cards, elevated surfaces
  
  // Accent & Borders
  accentBorder: '#c4a574',      // Borders, dividers
  
  // Text Colors
  textPrimary: '#3d2f20',       // Primary text color
  textSecondary: '#6b5544',     // Secondary text, labels
  
  // Surface
  surface: '#ffffff',           // Cards, inputs (use with 80% opacity + backdrop blur)
  
  // Additional UI Colors
  error: '#d32f2f',             // Error messages
  success: '#388e3c',           // Success messages
  warning: '#f57c00',           // Warning messages
  info: '#1976d2',              // Info messages
};

// Typography Styles
export const typography = StyleSheet.create({
  headingLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headingMedium: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
});

// Common Component Styles
export const commonStyles = StyleSheet.create({
  // Card Style
  card: {
    backgroundColor: colors.surface + 'CC', // 80% opacity
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 12,
    padding: 16,
  },
  
  // Button Styles
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Navigation Bar Style
  navigationBar: {
    backgroundColor: colors.backgroundWarm + 'F2', // 95% opacity
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  
  // Input Style
  input: {
    backgroundColor: colors.surface + 'CC',
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  
  // Shadow/Elevation
  shadow: {
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Container
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  
  // Content Padding
  contentPadding: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});

// Gradient Colors (for use with LinearGradient)
export const gradients = {
  primary: [colors.primary, colors.primaryDark],
  background: [colors.backgroundLight, colors.backgroundWarm],
};
