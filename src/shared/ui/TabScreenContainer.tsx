import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

interface TabScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Wrapper for tab screens that adds bottom padding so content isn't hidden behind the tab bar. */
export default function TabScreenContainer({ children, style }: TabScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56;
  const paddingBottom = Math.max(insets.bottom, theme.spacing.md) + tabBarHeight;

  return (
    <View style={[styles.container, { paddingBottom }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
