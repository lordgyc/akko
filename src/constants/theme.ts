/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2D2520',
    background: '#FDFBF7',
    backgroundElement: '#F4EFE6',
    backgroundSelected: '#E8DFC9',
    textSecondary: '#7E7368',
    tint: '#2D2520',
    purple: '#C06C47', // Cozy Terracotta
    error: '#CD5C5C',
    success: '#527E5D',
    border: '#EBE3D5',
    card: '#FFFFFF',
  },
  dark: {
    text: '#2D2520',
    background: '#FDFBF7',
    backgroundElement: '#F4EFE6',
    backgroundSelected: '#E8DFC9',
    textSecondary: '#7E7368',
    tint: '#2D2520',
    purple: '#C06C47', // Cozy Terracotta
    error: '#CD5C5C',
    success: '#527E5D',
    border: '#EBE3D5',
    card: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
