import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootStackNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'>;

interface Stop {
  id: string;
  sequence: number;
  type: 'Pickup' | 'Delivery';
  address: string;
  status: string;
  scheduledTime: string;
}

// Mock data based on tripId
const getMockStops = (tripId: string): Stop[] => {
  return [
    {
      id: 'stop-1',
      sequence: 1,
      type: 'Pickup',
      address: '123 Main St, New York, NY',
      status: 'Completed',
      scheduledTime: '08:00 AM',
    },
    {
      id: 'stop-2',
      sequence: 2,
      type: 'Delivery',
      address: '456 Oak Ave, Philadelphia, PA',
      status: 'In Transit',
      scheduledTime: '12:00 PM',
    },
    {
      id: 'stop-3',
      sequence: 3,
      type: 'Delivery',
      address: '789 Pine Rd, Baltimore, MD',
      status: 'Scheduled',
      scheduledTime: '04:00 PM',
    },
    {
      id: 'stop-4',
      sequence: 4,
      type: 'Delivery',
      address: '321 Elm St, Washington, DC',
      status: 'Scheduled',
      scheduledTime: '06:00 PM',
    },
  ];
};

export default function TripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const stops = getMockStops(tripId);

  const renderStop = ({ item }: { item: Stop }) => (
    <TouchableOpacity
      style={styles.stopCard}
      onPress={() =>
        navigation.navigate('StopDetail', { stopId: item.id, tripId })
      }>
      <View style={styles.stopHeader}>
        <View style={styles.sequenceBadge}>
          <Text style={styles.sequenceText}>{item.sequence}</Text>
        </View>
        <View style={styles.stopInfo}>
          <Text style={styles.stopType}>{item.type}</Text>
          <Text style={styles.stopAddress}>{item.address}</Text>
          <Text style={styles.scheduledTime}>
            Scheduled: {item.scheduledTime}
          </Text>
        </View>
        <Text style={[styles.stopStatus, getStopStatusStyle(item.status)]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tripInfo}>
        <Text style={styles.tripInfoText}>Trip ID: {tripId}</Text>
        <Text style={styles.tripInfoText}>Total Stops: {stops.length}</Text>
      </View>
      <FlatList
        data={stops}
        renderItem={renderStop}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function getStopStatusStyle(status: string) {
  switch (status) {
    case 'Completed':
      return { backgroundColor: '#4caf50', color: '#fff' };
    case 'In Transit':
      return { backgroundColor: '#2196f3', color: '#fff' };
    case 'Scheduled':
      return { backgroundColor: '#ff9800', color: '#fff' };
    default:
      return { backgroundColor: '#9e9e9e', color: '#fff' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tripInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tripInfoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  list: {
    padding: 15,
  },
  stopCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sequenceBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sequenceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stopInfo: {
    flex: 1,
  },
  stopType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  scheduledTime: {
    fontSize: 12,
    color: '#999',
  },
  stopStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
