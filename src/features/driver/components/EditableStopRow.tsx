import React from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import AppText from '../../../shared/ui/AppText';
import { theme } from '../../../shared/theme/theme';
import { getStopAddress } from './transportListHelpers';
import { Stop } from '../../../api/types';

interface EditableStopRowProps {
  stop: Stop;
  sequence: number;
  /** Show overflow menu (Move / Unassign) and reorder buttons or drag handle */
  editMode?: boolean;
  /** When set, show drag handle (long-press to drag); hide up/down buttons */
  onDrag?: () => void;
  /** Can move up (reorder) – ignored when onDrag is set */
  canMoveUp?: boolean;
  /** Can move down (reorder) – ignored when onDrag is set */
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToTrip?: () => void;
  onUnassign?: () => void;
  /** Delivered stops are locked (no reorder, no menu) */
  locked?: boolean;
}

export default function EditableStopRow({
  stop,
  sequence,
  editMode = false,
  onDrag,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onMoveToTrip,
  onUnassign,
  locked = false,
}: EditableStopRowProps) {
  const address = getStopAddress({
    addressLine1: stop.addressLine1,
    postalCode: stop.postalCode,
    city: stop.city,
  });

  const showMenu = editMode && !locked && (onMoveToTrip || onUnassign);
  const useDragHandle = Boolean(onDrag);
  const useUpDown = editMode && !locked && !useDragHandle;

  const handleMenuPress = () => {
    if (!showMenu) return;
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }[] = [];
    if (onMoveToTrip) buttons.push({ text: 'Move to another trip', onPress: onMoveToTrip });
    if (onUnassign) buttons.push({ text: 'Unassign from trip', onPress: onUnassign });
    if (buttons.length === 0) return;
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Stop', undefined, buttons);
  };

  return (
    <View style={styles.row}>
      {useDragHandle && (
        <Pressable
          onLongPress={onDrag}
          style={styles.dragHandle}
          hitSlop={8}>
          <AppText variant="body" color="textSecondary">≡</AppText>
        </Pressable>
      )}
      {useUpDown && (
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={!canMoveUp}
            style={[styles.reorderBtn, !canMoveUp && styles.reorderBtnDisabled]}>
            <AppText variant="body" color={canMoveUp ? 'primary' : 'textSecondary'}>↑</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={!canMoveDown}
            style={[styles.reorderBtn, !canMoveDown && styles.reorderBtnDisabled]}>
            <AppText variant="body" color={canMoveDown ? 'primary' : 'textSecondary'}>↓</AppText>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.sequenceBadge}>
        <AppText variant="body" weight="bold" color="white">
          {sequence}
        </AppText>
      </View>
      <View style={styles.info}>
        <AppText variant="body" weight="medium" color="text" numberOfLines={2}>
          {address}
        </AppText>
      </View>
      {showMenu && (
        <Pressable onPress={handleMenuPress} style={styles.menuBtn} hitSlop={8}>
          <AppText variant="body" color="primary">⋮</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dragHandle: {
    marginRight: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  reorderButtons: {
    flexDirection: 'column',
    marginRight: theme.spacing.xs,
  },
  reorderBtn: {
    padding: 2,
  },
  reorderBtnDisabled: {
    opacity: 0.4,
  },
  sequenceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  info: {
    flex: 1,
  },
  menuBtn: {
    padding: theme.spacing.sm,
  },
});
