import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootStackNavigator';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { ENV } from '../../config/env';
import { apiClient, getRequestLogs } from '../../api/client';
import { checkHealth } from '../../api/health';

type Props = NativeStackScreenProps<RootStackParamList, 'NetworkDiagnostics'>;

export default function NetworkDiagnosticsScreen({}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [healthCheckResult, setHealthCheckResult] = useState<{
    success: boolean;
    status?: number;
    message: string;
    data?: unknown;
  } | null>(null);
  const [requestLogs, setRequestLogs] = useState(getRequestLogs());

  const handleRefresh = () => {
    setRefreshing(true);
    setRequestLogs(getRequestLogs());
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleHealthCheck = async () => {
    setHealthCheckResult(null);
    const result = await checkHealth();
    setHealthCheckResult(result);
    // Refresh logs after health check
    setRequestLogs(getRequestLogs());
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const axiosBaseUrl = apiClient.defaults.baseURL || 'Not set';

  return (
    <Screen scrollable style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {/* Configuration Section */}
        <Card style={styles.section}>
          <AppText variant="h2" weight="bold" color="text" style={styles.sectionTitle}>
            API Configuration
          </AppText>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              ENV.API_BASE_URL:
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {ENV.API_BASE_URL}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Axios baseURL:
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {axiosBaseUrl}
            </AppText>
          </View>
        </Card>

        {/* Health Check Section */}
        <Card style={styles.section}>
          <AppText variant="h2" weight="bold" color="text" style={styles.sectionTitle}>
            Health Check
          </AppText>
          <Button
            title="Test /api/health"
            onPress={handleHealthCheck}
            style={styles.button}
          />
          {healthCheckResult && (
            <View style={styles.result}>
              <AppText
                variant="body"
                weight="semibold"
                color={healthCheckResult.success ? 'success' : 'error'}
                style={styles.resultText}>
                {healthCheckResult.success ? '✓' : '✗'} {healthCheckResult.message}
              </AppText>
              {healthCheckResult.status && (
                <AppText variant="bodySmall" color="textSecondary">
                  Status: {healthCheckResult.status}
                </AppText>
              )}
              {healthCheckResult.data && (
                <AppText variant="caption" color="textSecondary" style={styles.dataText}>
                  {JSON.stringify(healthCheckResult.data, null, 2)}
                </AppText>
              )}
            </View>
          )}
        </Card>

        {/* Request Logs Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h2" weight="bold" color="text" style={styles.sectionTitle}>
              Recent Requests (Last 10)
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {requestLogs.length} logged
            </AppText>
          </View>
          {requestLogs.length === 0 ? (
            <AppText variant="body" color="textSecondary" style={styles.emptyText}>
              No requests logged yet. Make an API call to see logs here.
            </AppText>
          ) : (
            requestLogs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <AppText variant="body" weight="semibold" color="text">
                    {log.method} {log.fullUrl}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    {formatTimestamp(log.timestamp)}
                  </AppText>
                </View>
                {log.status !== undefined && (
                  <AppText
                    variant="caption"
                    color={log.status >= 200 && log.status < 300 ? 'success' : 'error'}>
                    Status: {log.status}
                  </AppText>
                )}
                {log.error && (
                  <AppText variant="caption" color="error">
                    Error: {log.error}
                  </AppText>
                )}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    marginBottom: theme.spacing.sm,
  },
  value: {
    marginTop: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  button: {
    marginTop: theme.spacing.sm,
  },
  result: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.md,
  },
  resultText: {
    marginBottom: theme.spacing.xs,
  },
  dataText: {
    marginTop: theme.spacing.sm,
    fontFamily: 'monospace',
  },
  logItem: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
});
