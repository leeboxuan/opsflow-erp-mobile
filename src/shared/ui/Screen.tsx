import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export default function Screen({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const containerStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (scrollable) {
    return (
      <ScrollView
        style={[containerStyle, style]}
        contentContainerStyle={[
          { padding: theme.spacing.md },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[containerStyle, { padding: theme.spacing.md }, style]}>
      {children}
    </View>
  );
}
