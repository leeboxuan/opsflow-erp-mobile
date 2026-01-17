import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface AppTextProps extends TextProps {
  variant?:
    | 'display'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'body'
    | 'bodySmall'
    | 'caption'
    | 'label';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: keyof typeof theme.colors;
}

export default function AppText({
  variant = 'body',
  weight = 'regular',
  color = 'text',
  style,
  children,
  ...props
}: AppTextProps) {
  const variantStyles = {
    display: styles.display,
    h1: styles.h1,
    h2: styles.h2,
    h3: styles.h3,
    body: styles.body,
    bodySmall: styles.bodySmall,
    caption: styles.caption,
    label: styles.label,
  };

  const weightStyles = {
    regular: { fontWeight: theme.typography.fontWeight.regular },
    medium: { fontWeight: theme.typography.fontWeight.medium },
    semibold: { fontWeight: theme.typography.fontWeight.semibold },
    bold: { fontWeight: theme.typography.fontWeight.bold },
  };

  return (
    <Text
      style={[
        variantStyles[variant],
        weightStyles[weight],
        { color: theme.colors[color] },
        style,
      ]}
      {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: {
    fontSize: theme.typography.fontSize.display,
    lineHeight: theme.typography.lineHeight.display,
  },
  h1: {
    fontSize: theme.typography.fontSize.xxxl,
    lineHeight: theme.typography.lineHeight.xxxl,
  },
  h2: {
    fontSize: theme.typography.fontSize.xxl,
    lineHeight: theme.typography.lineHeight.xxl,
  },
  h3: {
    fontSize: theme.typography.fontSize.xl,
    lineHeight: theme.typography.lineHeight.xl,
  },
  body: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.md,
  },
  bodySmall: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  caption: {
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.lineHeight.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
