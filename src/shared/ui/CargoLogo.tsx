import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { theme } from '../theme/theme';
import AppText from './AppText';

export default function CargoLogo() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pingScale = useRef(new Animated.Value(1)).current;
  const pingOpacity = useRef(new Animated.Value(1)).current;

  // Floating animation (gentle up/down)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  // Ping animation (scale + fade loop)
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pingScale, {
            toValue: 1.5,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pingScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pingOpacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pingOpacity, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [pingScale, pingOpacity]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ translateY: floatAnim }],
          },
        ]}>
        {/* Rounded square with gradient-like appearance */}
        <View style={styles.iconContainer}>
          <View style={styles.gradientOverlay} />
          
          {/* Cargo box/truck SVG icon */}
          <Svg width={48} height={48} viewBox="0 0 48 48" style={styles.icon}>
            {/* Truck body */}
            <Rect
              x="8"
              y="20"
              width="20"
              height="16"
              rx="2"
              fill="none"
              stroke={theme.colors.primary}
              strokeWidth="2"
            />
            {/* Truck cabin */}
            <Rect
              x="28"
              y="24"
              width="8"
              height="12"
              rx="1"
              fill="none"
              stroke={theme.colors.primary}
              strokeWidth="2"
            />
            {/* Wheels */}
            <Rect
              x="12"
              y="32"
              width="4"
              height="4"
              rx="2"
              fill={theme.colors.primary}
            />
            <Rect
              x="20"
              y="32"
              width="4"
              height="4"
              rx="2"
              fill={theme.colors.primary}
            />
            {/* Cargo lines */}
            <Path
              d="M12 20 L12 36 M16 20 L16 36 M20 20 L20 36 M24 20 L24 36"
              stroke={theme.colors.primaryLight}
              strokeWidth="1"
              opacity="0.5"
            />
          </Svg>

          {/* Status indicator dot with ping animation */}
          <View style={styles.statusContainer}>
            <Animated.View
              style={[
                styles.pingRing,
                {
                  transform: [{ scale: pingScale }],
                  opacity: pingOpacity,
                },
              ]}
            />
            <View style={styles.statusDot} />
          </View>
        </View>
      </Animated.View>

      {/* Text */}
      <View style={styles.textContainer}>
        <AppText variant="h1" weight="bold" color="primary">
          Cargo ERP
        </AppText>
        <AppText variant="bodySmall" color="textSecondary" style={styles.subtitle}>
          Transport Management
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoContainer: {
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
  },
  icon: {
    zIndex: 1,
  },
  statusContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pingRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
    opacity: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
    zIndex: 2,
  },
  textContainer: {
    alignItems: 'center',
  },
  subtitle: {
    marginTop: theme.spacing.xs,
  },
});
