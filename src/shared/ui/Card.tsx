import React from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: keyof typeof theme.spacing;
}

export default function Card({
  children,
  onPress,
  padding = 'md',
  style,
  ...props
}: CardProps) {
  const cardStyle = [
    styles.card,
    { padding: theme.spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        {...props}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...theme.shadows.md,
  },
});
