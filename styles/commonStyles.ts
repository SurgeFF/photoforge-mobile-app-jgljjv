
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// PhotoForge color palette - matching the webapp design
export const colors = {
  primary: '#c87941',           // Main brand color, buttons, highlights
  primaryDark: '#8b5a2b',       // Darker shade for gradients
  backgroundLight: '#f5f1e8',   // Main background color
  backgroundWarm: '#d4c4a8',    // Navigation, cards, elevated surfaces
  accentBorder: '#c4a574',      // Borders, dividers
  textPrimary: '#3d2f20',       // Primary text color
  textSecondary: '#6b5544',     // Secondary text, labels
  surface: '#ffffff',           // Cards, inputs (80% opacity with backdrop blur)
  
  // Legacy aliases for compatibility
  background: '#f5f1e8',
  text: '#3d2f20',
  grey: '#6b5544',
  card: '#d4c4a8',
  border: '#c4a574',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

export const typography = {
  headingLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  headingMedium: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  primaryText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.backgroundLight,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    ...typography.headingLarge,
    textAlign: 'center',
    marginBottom: 10,
  },
  text: {
    ...typography.body,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.surface + 'CC', // 80% opacity
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 4px 12px rgba(61, 47, 32, 0.15)',
    elevation: 4,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: colors.primary,
  },
  navBar: {
    backgroundColor: colors.backgroundWarm + 'F2', // 95% opacity
    borderColor: colors.accentBorder,
    borderWidth: 1,
  },
});
