import React from 'react';
import { StyleSheet } from 'react-native';
import { useAuth } from '../../shared/context/AuthContext';
import { logout } from '../../api/auth';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';

/**
 * Shown when user has no tenant memberships (non-superadmin).
 * Message + logout so they can sign in with an account that has access.
 */
export default function NoAccessScreen() {
  const { setUser } = useAuth();

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <AppText variant="h2" weight="bold" color="text" style={styles.title}>
          No access
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.message}>
          Your account has no tenant assigned. Please contact your administrator or sign in with a different account.
        </AppText>
        <Button title="Sign out" onPress={handleLogout} variant="destructive" style={styles.button} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  message: {
    marginBottom: theme.spacing.lg,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
});
