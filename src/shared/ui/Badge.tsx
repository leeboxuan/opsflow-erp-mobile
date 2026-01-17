import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import AppText from './AppText';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  const variantStyles = {
    success: {
      backgroundColor: theme.colors.success,
      color: theme.colors.white,
    },
    warning: {
      backgroundColor: theme.colors.warning,
      color: theme.colors.white,
    },
    error: {
      backgroundColor: theme.colors.error,
      color: theme.colors.white,
    },
    info: {
      backgroundColor: theme.colors.info,
      color: theme.colors.white,
    },
    default: {
      backgroundColor: theme.colors.gray300,
      color: theme.colors.gray800,
    },
  };

  const currentStyle = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: currentStyle.backgroundColor },
      ]}>
      <AppText
        variant="caption"
        weight="semibold"
        style={{ color: currentStyle.color }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
});
