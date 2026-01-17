import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootStackNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'StopDetail'>;

// Mock stop data
const getMockStopData = (stopId: string) => {
  return {
    id: stopId,
    sequence: 1,
    type: 'Delivery',
    address: '123 Main St, New York, NY 10001',
    status: 'In Transit',
    scheduledTime: '12:00 PM',
    customerName: 'ABC Company',
    phoneNumber: '(555) 123-4567',
    notes: 'Please deliver to the loading dock.',
  };
};

export default function StopDetailScreen({ route }: Props) {
  const { stopId, tripId } = route.params;
  const stopData = getMockStopData(stopId);
  const [status, setStatus] = React.useState(stopData.status);

  const handleArrived = () => {
    Alert.alert(
      'Arrived',
      'You have marked this stop as arrived.',
      [{ text: 'OK', onPress: () => setStatus('Arrived') }]
    );
  };

  const handleComplete = () => {
    Alert.alert(
      'Complete',
      'Mark this stop as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setStatus('Completed');
            Alert.alert('Success', 'Stop marked as completed');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Stop Type</Text>
          <Text style={styles.value}>{stopData.type}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.value}>{stopData.address}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{stopData.customerName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{stopData.phoneNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Scheduled Time</Text>
          <Text style={styles.value}>{stopData.scheduledTime}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, styles.statusText]}>{status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{stopData.notes}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.arrivedButton]}
          onPress={handleArrived}
          disabled={status === 'Completed'}>
          <Text style={styles.buttonText}>Arrived</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.completeButton]}
          onPress={handleComplete}
          disabled={status === 'Completed'}>
          <Text style={styles.buttonText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  statusText: {
    fontWeight: 'bold',
    color: '#2196f3',
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  arrivedButton: {
    backgroundColor: '#2196f3',
  },
  completeButton: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
