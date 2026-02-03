import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootStackNavigator';
import Screen from '../../shared/ui/Screen';
import CargoLogo from '../../shared/ui/CargoLogo';
import Input from '../../shared/ui/Input';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import { theme } from '../../shared/theme/theme';
import { login } from '../../api/auth';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../shared/context/AuthContext';
import { getCurrentTenantId, getUser } from '../../shared/utils/authStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { refreshUser, setUser, setCurrentTenantId } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleLogin = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      // Call real API login (stores token and tenantId immediately)
      const loginResult = await login({
        email: email.trim(),
        password: password.trim(),
      });

      // Update AuthContext state immediately with user and tenantId from login response
      // This ensures headers are ready before /auth/me is called
      if (loginResult.user) {
        setUser(loginResult.user);
        
        // Set tenantId in context if available from login response
        const tenantId = loginResult.user.tenantId || getCurrentTenantId();
        if (tenantId) {
          setCurrentTenantId(tenantId);
        }
      }

      // Now refresh user (calls /auth/me with headers already set)
      await refreshUser();

      // Navigation will be handled by RootStackNavigator based on auth state
    } catch (err) {
      // Show error message
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // Also show alert for better UX
      Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scrollable
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      {/* Animated Cargo Logo */}
      <CargoLogo />

      {/* Login Form Card */}
      <Card style={styles.formCard}>
        <Input
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(undefined); // Clear error when user types
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(undefined); // Clear error when user types
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={error}
        />
        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
        />
        <Button
          title="Network Diagnostics"
          onPress={() => navigation.navigate('NetworkDiagnostics')}
          variant="outline"
          style={styles.debugButton}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  formCard: {
    width: '100%',
  },
  button: {
    marginTop: theme.spacing.sm,
  },
  debugButton: {
    marginTop: theme.spacing.sm,
  },
});
