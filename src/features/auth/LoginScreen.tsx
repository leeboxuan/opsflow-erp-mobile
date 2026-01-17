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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleLogin = async () => {
    // Validation
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      // Call real API login
      await login({
        username: username.trim(),
        password: password.trim(),
      });

      // Navigate to trips list on success
      navigation.replace('TripsList');
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
          label="Username"
          placeholder="Enter your username"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setError(undefined); // Clear error when user types
          }}
          autoCapitalize="none"
          autoCorrect={false}
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
});
