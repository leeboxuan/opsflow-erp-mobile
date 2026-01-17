export const colors = {
  // Primary brand colors
  primary: '#6200ee',
  primaryDark: '#3700b3',
  primaryLight: '#bb86fc',

  // Secondary colors
  secondary: '#03dac6',
  secondaryDark: '#018786',

  // Status colors
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',

  // Grayscale
  white: '#ffffff',
  black: '#000000',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#eeeeee',
  gray300: '#e0e0e0',
  gray400: '#bdbdbd',
  gray500: '#9e9e9e',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Semantic colors
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#212121',
  textSecondary: '#757575',
  border: '#e0e0e0',
  divider: '#e0e0e0',

  // Status backgrounds (light variants)
  successLight: '#e8f5e9',
  warningLight: '#fff3e0',
  errorLight: '#ffebee',
  infoLight: '#e3f2fd',
} as const;

export type ColorName = keyof typeof colors;
