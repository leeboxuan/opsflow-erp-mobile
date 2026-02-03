import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Image, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DriverTabsParamList } from '../../app/navigation/DriverTabs';
import { completeStop } from '../../api/driver';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<DriverTabsParamList, 'PODCapture'>;

export default function PODCaptureScreen({ route, navigation }: Props) {
  const { stopId } = route.params;
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock image picker - in production, use react-native-image-picker or expo-image-picker
  const handleTakePhoto = () => {
    Alert.alert(
      'Take Photo',
      'Photo capture functionality will be implemented with react-native-image-picker or expo-image-picker.',
      [{ text: 'OK' }]
    );
    // TODO: Implement actual photo capture
    // For now, mock it
    setPhotoUri('mock-photo-uri');
  };

  const handlePickPhoto = () => {
    Alert.alert(
      'Pick Photo',
      'Photo picker functionality will be implemented with react-native-image-picker or expo-image-picker.',
      [{ text: 'OK' }]
    );
    // TODO: Implement actual photo picking
    // For now, mock it
    setPhotoUri('mock-photo-uri');
  };

  const handleSubmit = async () => {
    if (!photoUri) {
      Alert.alert('Error', 'Please take or pick a photo first.');
      return;
    }

    setLoading(true);
    try {
      // MVP: pass local image URI as podPhotoKeys; later use storage keys
      await completeStop(stopId, {
        podPhotoKeys: [photoUri],
        signedBy: note.trim() || undefined,
      });
      Alert.alert('Success', 'POD submitted and stop completed.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete stop with POD.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.infoCard}>
          <AppText variant="body" color="textSecondary">
            Capture proof of delivery for this stop.
          </AppText>
        </Card>

        <Card style={styles.photoCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Photo
          </AppText>
          {photoUri ? (
            <View style={styles.photoPreview}>
              <AppText variant="body" color="textSecondary">
                Photo selected (mock)
              </AppText>
              {/* In production, show actual image */}
              {/* <Image source={{ uri: photoUri }} style={styles.photo} /> */}
              <Button
                title="Retake Photo"
                onPress={handleTakePhoto}
                variant="outline"
                style={styles.photoButton}
              />
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Button
                title="Take Photo"
                onPress={handleTakePhoto}
                style={styles.photoButton}
              />
              <Button
                title="Pick from Gallery"
                onPress={handlePickPhoto}
                variant="outline"
                style={styles.photoButton}
              />
            </View>
          )}
        </Card>

        <Card style={styles.noteCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Notes (Optional)
          </AppText>
          <TextInput
            style={styles.noteInput}
            placeholder="Add any notes about the delivery..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </Card>

        <Card style={styles.submitCard}>
          <Button
            title="Submit POD"
            onPress={handleSubmit}
            loading={loading}
            disabled={!photoUri || loading}
            style={styles.submitButton}
          />
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.cancelButton}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  infoCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.infoLight,
  },
  photoCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  photoPreview: {
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.md,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  photoButton: {
    flex: 1,
  },
  noteCard: {
    marginBottom: theme.spacing.md,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  submitCard: {
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    marginBottom: theme.spacing.sm,
  },
  cancelButton: {
    // Additional styling if needed
  },
});
