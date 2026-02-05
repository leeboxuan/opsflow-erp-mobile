import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../../app/navigation/AdminTabs';
import { createOrder, isDuplicateOrderRefError } from '../../api/orders';
import { CreateOrderRequest, OrderStop, InventoryItem } from '../../api/types';
import { getErrorMessage } from '../../api/client';
import { searchPlacesAutocomplete, getPlaceDetails } from '../../api/places';
import { getInventoryItems } from '../../api/inventory';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../../shared/ui/Card';
import Input from '../../shared/ui/Input';
import Button from '../../shared/ui/Button';
import AppText from '../../shared/ui/AppText';
import { theme } from '../../shared/theme/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const POSTAL_CODE_REGEX = /^\d{6}$/;
const CARD_RADIUS = 18;
const ELEVATION_LOW = 1;
const FOOTER_GAP_ABOVE_TAB = 8;

/** Crockford base32 (0-9 A-V) for short unique suffix */
const ULID_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function genOrderRef(): string {
  const d = new Date();
  const yyyymmdd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  let short = '';
  for (let i = 0; i < 8; i++) {
    short += ULID_CHARS[Math.floor(Math.random() * ULID_CHARS.length)];
  }
  return `OF-SG-${yyyymmdd}-${short}`;
}

function defaultPlannedAt(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)}T12:00:00`;
}

type Props = NativeStackScreenProps<OrdersStackParamList, 'CreateOrder'>;

interface FormErrors {
  customerName?: string;
  addressLine1?: string;
  postalCode?: string;
  _submit?: string;
}

interface LineItem {
  inventoryItemId: string;
  item: InventoryItem;
  quantity: number;
}

export default function CreateOrderScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const dateKey = new Date().toISOString().slice(0, 10);

  const [orderRef, setOrderRef] = useState(() => genOrderRef());
  const [, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [postalCodeFromGoogle, setPostalCodeFromGoogle] = useState(false);
  const [floor, setFloor] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');

  const invalidateAfterCreate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['unassignedOrders', dateKey] });
    queryClient.invalidateQueries({ queryKey: ['transportTrips', dateKey] });
  }, [queryClient, dateKey]);

  const resetForm = useCallback((assignNewOrderRef = false) => {
    if (assignNewOrderRef) setOrderRef(genOrderRef());
    setCustomerName('');
    setAddressSearchQuery('');
    setAddressLine1('');
    setPostalCode('');
    setPostalCodeFromGoogle(false);
    setFloor('');
    setUnit('');
    setNotes('');
    setShowAddressSuggestions(false);
    setErrors({});
    setToast({ visible: false, message: '' });
    setLineItems([]);
    setInventorySearch('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm(true);
      return () => {
        resetForm(false);
      };
    }, [resetForm])
  );

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderRequest) => createOrder(data),
    onError: (error: Error) => {
      setErrors((e) => ({ ...e, _submit: error.message }));
    },
  });

  const [debouncedAddressQuery, setDebouncedAddressQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAddressQuery(addressSearchQuery), 300);
    return () => clearTimeout(t);
  }, [addressSearchQuery]);

  const { data: addressSuggestions = [], isFetching: addressSearching } = useQuery({
    queryKey: ['placesAutocomplete', debouncedAddressQuery],
    queryFn: () => searchPlacesAutocomplete(debouncedAddressQuery),
    enabled: debouncedAddressQuery.length >= 2,
    staleTime: 60 * 1000,
  });

  const { data: inventoryResults = [], isFetching: inventorySearching } = useQuery({
    queryKey: ['inventoryItems', inventorySearch],
    queryFn: () => getInventoryItems(inventorySearch),
    enabled: inventorySearch.length >= 1,
    staleTime: 30 * 1000,
  });

  const handleCopyOrderRef = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(orderRef);
      setToast({ visible: true, message: 'Copied' });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1500);
    } catch {
      setToast({ visible: true, message: 'Copy failed' });
    }
  }, [orderRef]);

  const handleSelectAddress = useCallback(
    async (placeId: string) => {
      setShowAddressSuggestions(false);
      setAddressSearchQuery('');
      const details = await getPlaceDetails(placeId);
      if (details) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAddressLine1(details.formattedAddress);
        if (details.postalCode) {
          setPostalCode(details.postalCode);
          setPostalCodeFromGoogle(true);
        } else {
          setPostalCodeFromGoogle(false);
        }
        setErrors((e) => ({ ...e, addressLine1: undefined, postalCode: undefined }));
      }
    },
    []
  );

  const addressLine2 = React.useMemo(() => {
    const f = floor.trim();
    const u = unit.trim();
    if (f && u) return `#${f}-${u}`;
    if (f) return `#${f}`;
    if (u) return `Unit: ${u}`;
    return undefined;
  }, [floor, unit]);

  const addLineItem = useCallback((item: InventoryItem) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLineItems((prev) => {
      const existing = prev.find((l) => l.inventoryItemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.inventoryItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { inventoryItemId: item.id, item, quantity: 1 }];
    });
  }, []);

  const updateLineItemQty = useCallback((inventoryItemId: string, delta: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLineItems((prev) =>
      prev
        .map((l) =>
          l.inventoryItemId === inventoryItemId
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const removeLineItem = useCallback((inventoryItemId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLineItems((prev) => prev.filter((l) => l.inventoryItemId !== inventoryItemId));
  }, []);

  const isFormValid =
    customerName.trim().length > 0 &&
    addressLine1.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    POSTAL_CODE_REGEX.test(postalCode.trim());

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
    if (!postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!POSTAL_CODE_REGEX.test(postalCode.trim())) {
      newErrors.postalCode = 'Postal code must be exactly 6 digits (Singapore)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customerName, addressLine1, postalCode]);

  const buildPayload = useCallback(
    (ref: string): CreateOrderRequest => {
      const stop: OrderStop = {
        type: 'DELIVERY',
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2 || undefined,
        postalCode: postalCode.trim(),
        city: 'Singapore',
        country: 'SG',
        plannedAt: defaultPlannedAt(),
      };
      return {
        orderRef: ref,
        customerName: customerName.trim(),
        stops: [stop],
        items:
          lineItems.length > 0
            ? lineItems.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: l.quantity }))
            : undefined,
      };
    },
    [customerName, addressLine1, addressLine2, postalCode, lineItems]
  );

  const handleSubmit = useCallback(async () => {
    if (!validate() || !isFormValid) return;
    setErrors((e) => ({ ...e, _submit: undefined }));
    setSubmitting(true);
    let payload = buildPayload(orderRef);
    try {
      const createdOrder = await createOrder(payload);
      setSubmitting(false);
      invalidateAfterCreate();
      setToast({ visible: true, message: 'Order created' });
      (navigation as { replace: (screen: string, params: { orderId: string }) => void }).replace('OrderDetail', { orderId: createdOrder.id });
    } catch (err) {
      if (isDuplicateOrderRefError(err)) {
        const newRef = genOrderRef();
        setOrderRef(newRef);
        payload = buildPayload(newRef);
        try {
          const createdOrder = await createOrder(payload);
          setSubmitting(false);
          invalidateAfterCreate();
          setToast({ visible: true, message: 'Order created' });
          (navigation as { replace: (screen: string, params: { orderId: string }) => void }).replace('OrderDetail', { orderId: createdOrder.id });
        } catch (retryErr) {
          setSubmitting(false);
          setErrors((e) => ({ ...e, _submit: getErrorMessage(retryErr) }));
          setToast({ visible: true, message: getErrorMessage(retryErr) });
        }
      } else {
        setSubmitting(false);
        setErrors((e) => ({ ...e, _submit: getErrorMessage(err) }));
        setToast({ visible: true, message: getErrorMessage(err) });
      }
    }
  }, [validate, isFormValid, buildPayload, orderRef, invalidateAfterCreate, navigation]);

  const hasParsedAddress = addressLine1.length > 0;

  const cardStyle = [styles.card, { borderRadius: CARD_RADIUS }];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {/* KeyboardAwareScrollView scrolls the focused input into view and keeps the submit button tappable when the keyboard is open (iOS and Android). */}
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, styles.scrollContentGrow]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={24}>
          {/* 1) Identity card */}
          <Card style={[styles.section, cardStyle]} padding="lg">
            <AppText variant="label" color="textSecondary" style={styles.cardTitle}>
              Identity
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.fieldLabel}>
              Order ref
            </AppText>
            <View style={styles.orderRefRow}>
              <View style={[styles.orderRefValue, styles.filledInput]}>
                <AppText variant="body" color="text" numberOfLines={1} selectable>
                  {orderRef}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={handleCopyOrderRef}
                style={styles.copyBtn}
                accessibilityLabel="Copy order ref">
                <AppText variant="body" color="primary">Copy</AppText>
              </TouchableOpacity>
            </View>
            <AppText variant="caption" color="textSecondary" style={styles.helperText}>
              Used for Delivery Order (DO) signing
            </AppText>
            <Input
              label="Customer name *"
              placeholder="Enter customer name"
              value={customerName}
              onChangeText={(text) => {
                setCustomerName(text);
                if (errors.customerName) setErrors((e) => ({ ...e, customerName: undefined }));
              }}
              error={errors.customerName}
              editable={!createOrderMutation.isPending}
              containerStyle={styles.inputContainer}
              style={styles.filledInput}
            />
          </Card>

          {/* 2) Delivery card */}
          <Card style={[styles.section, cardStyle]} padding="lg">
            <AppText variant="label" color="textSecondary" style={styles.cardTitle}>
              Delivery
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.fieldLabel}>
              Address (search) *
            </AppText>
            <View style={styles.addressSearchWrap}>
              <TextInput
                style={[
                  styles.filledInput,
                  styles.input,
                  styles.addressSearchInput,
                  errors.addressLine1 && styles.inputError,
                ]}
                placeholder="Search address (Google Places)..."
                placeholderTextColor={theme.colors.gray500}
                value={addressSearchQuery}
                onChangeText={(text) => {
                  setAddressSearchQuery(text);
                  setShowAddressSuggestions(true);
                }}
                onFocus={() => addressSearchQuery.length >= 2 && setShowAddressSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                editable={!createOrderMutation.isPending}
              />
              {addressSearching && (
                <ActivityIndicator size="small" color={theme.colors.primary} style={styles.searchSpinner} />
              )}
            </View>
            {showAddressSuggestions && debouncedAddressQuery.length >= 2 && (
              <View style={styles.suggestionsList}>
                {addressSuggestions.length === 0 && !addressSearching && (
                  <AppText variant="caption" color="textSecondary" style={styles.suggestionItem}>
                    No results (enter address manually below)
                  </AppText>
                )}
                {addressSuggestions.slice(0, 5).map((p) => (
                  <Pressable
                    key={p.placeId}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectAddress(p.placeId)}>
                    <AppText variant="body" color="text" numberOfLines={2}>
                      {p.description}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}

            {hasParsedAddress && (
              <View style={styles.parsedBlock}>
                <View style={styles.parsedBlockHeader}>
                  <AppText variant="caption" color="textSecondary" style={styles.parsedLabel}>
                    Parsed address
                  </AppText>
                  <TouchableOpacity
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setAddressLine1('');
                      setPostalCode('');
                      setPostalCodeFromGoogle(false);
                    }}>
                    <AppText variant="caption" color="primary">Clear</AppText>
                  </TouchableOpacity>
                </View>
                <AppText variant="body" color="text" style={styles.parsedLine}>
                  {addressLine1}
                </AppText>
                {postalCode ? (
                  <AppText variant="body" color="textSecondary">
                    {postalCode}
                    {postalCodeFromGoogle && ' (from Google)'}
                  </AppText>
                ) : null}
              </View>
            )}

            {!hasParsedAddress && (
              <Input
                label="Address line 1 *"
                placeholder="Or enter street address manually"
                value={addressLine1}
                onChangeText={(text) => {
                  setAddressLine1(text);
                  setPostalCodeFromGoogle(false);
                  if (errors.addressLine1) setErrors((e) => ({ ...e, addressLine1: undefined }));
                }}
                error={errors.addressLine1}
                editable={!createOrderMutation.isPending}
                containerStyle={styles.inputContainer}
                style={styles.filledInput}
              />
            )}

            <Input
              label="Postal code *"
              placeholder="6 digits (Singapore)"
              value={postalCode}
              onChangeText={(text) => {
                if (!postalCodeFromGoogle) {
                  setPostalCode(text);
                  if (errors.postalCode) setErrors((e) => ({ ...e, postalCode: undefined }));
                }
              }}
              error={errors.postalCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!createOrderMutation.isPending && !postalCodeFromGoogle}
              containerStyle={styles.inputContainer}
              style={styles.filledInput}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Floor"
                  placeholder="e.g. 05"
                  value={floor}
                  onChangeText={setFloor}
                  editable={!createOrderMutation.isPending}
                  containerStyle={styles.inputContainer}
                  style={styles.filledInput}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Unit"
                  placeholder="e.g. 12"
                  value={unit}
                  onChangeText={setUnit}
                  editable={!createOrderMutation.isPending}
                  containerStyle={styles.inputContainer}
                  style={styles.filledInput}
                />
              </View>
            </View>

            <Input
              label="Notes (optional)"
              placeholder="Delivery notes"
              value={notes}
              onChangeText={setNotes}
              editable={!createOrderMutation.isPending}
              containerStyle={styles.inputContainer}
              style={styles.filledInput}
            />
          </Card>

          {/* 3) Items card */}
          <Card style={[styles.section, cardStyle]} padding="lg">
            <AppText variant="label" color="textSecondary" style={styles.cardTitle}>
              Items
            </AppText>
            <Input
              placeholder="Search by SKU, reference, or name"
              value={inventorySearch}
              onChangeText={setInventorySearch}
              containerStyle={styles.inputContainer}
              style={styles.filledInput}
              editable={!createOrderMutation.isPending}
            />
            {inventorySearch.length >= 1 && (
              <View style={styles.inlineResults}>
                {inventorySearching && (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={styles.inlineSpinner} />
                )}
                {!inventorySearching &&
                  inventoryResults.slice(0, 6).map((item) => (
                    <View key={item.id} style={styles.inlineResultRow}>
                      <AppText variant="body" color="text" numberOfLines={1} style={styles.flex1}>
                        {item.name || item.sku || item.reference || item.id}
                      </AppText>
                      <TouchableOpacity
                        style={styles.addItemBtn}
                        onPress={() => addLineItem(item)}>
                        <AppText variant="body" weight="semibold" color="primary">Add</AppText>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}

            {lineItems.length > 0 && (
              <View style={styles.selectedItems}>
                <AppText variant="caption" color="textSecondary" style={styles.selectedLabel}>
                  Selected
                </AppText>
                {lineItems.map((l) => (
                  <View key={l.inventoryItemId} style={styles.lineItemRow}>
                    <View style={styles.lineItemInfo}>
                      <AppText variant="body" weight="medium" color="text" numberOfLines={1}>
                        {l.item.name || l.item.sku || l.item.reference || l.inventoryItemId}
                      </AppText>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateLineItemQty(l.inventoryItemId, -1)}>
                          <AppText variant="body" color="primary">−</AppText>
                        </TouchableOpacity>
                        <AppText variant="body" weight="semibold" color="text" style={styles.qtyText}>
                          {l.quantity}
                        </AppText>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateLineItemQty(l.inventoryItemId, 1)}>
                          <AppText variant="body" color="primary">+</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeLineItem(l.inventoryItemId)}
                      style={styles.removeItemBtn}>
                      <AppText variant="body" color="error">Remove</AppText>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {errors._submit && (
              <AppText variant="bodySmall" color="error" style={styles.submitError}>
                {errors._submit}
              </AppText>
            )}
          </Card>

          {/* Footer inside scroll so it stays tappable when keyboard is open */}
          <View style={[styles.footerContainer, { paddingBottom: FOOTER_GAP_ABOVE_TAB }]}>
            <Button
              title="Create Order"
              onPress={handleSubmit}
              loading={createOrderMutation.isPending}
              disabled={!isFormValid || createOrderMutation.isPending}
              style={styles.ctaButton}
            />
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {toast.visible && (
        <View style={styles.toast}>
          <AppText variant="body" color="white" style={styles.toastMessage}>
            {toast.message}
          </AppText>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex1: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollContentGrow: {
    flexGrow: 1,
  },
  section: {
    marginBottom: theme.spacing.md,
    elevation: ELEVATION_LOW,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
  },
  cardTitle: {
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  orderRefValue: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.md,
  },
  copyBtn: {
    marginLeft: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  filledInput: {
    backgroundColor: theme.colors.gray100,
    borderWidth: 0,
  },
  input: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    minHeight: 48,
  },
  inputError: {
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  fieldLabel: {
    marginBottom: theme.spacing.xs,
  },
  helperText: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  addressSearchWrap: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  addressSearchInput: {
    minHeight: 52,
    paddingRight: 40,
  },
  searchSpinner: {
    position: 'absolute',
    right: theme.spacing.sm,
    top: 16,
  },
  suggestionsList: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  parsedBlock: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  parsedBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  parsedLabel: {},
  parsedLine: {
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  half: { flex: 1 },
  inlineResults: {
    marginBottom: theme.spacing.md,
  },
  inlineSpinner: {
    marginVertical: theme.spacing.sm,
  },
  inlineResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addItemBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  selectedItems: {
    marginTop: theme.spacing.sm,
  },
  selectedLabel: {
    marginBottom: theme.spacing.xs,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lineItemInfo: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  stepperBtn: {
    padding: theme.spacing.xs,
    minWidth: 36,
    alignItems: 'center',
  },
  qtyText: {
    marginHorizontal: theme.spacing.sm,
    minWidth: 24,
    textAlign: 'center',
  },
  removeItemBtn: { padding: theme.spacing.xs },
  submitError: { marginTop: theme.spacing.sm },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ctaButton: {},
  toast: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: '#323232',
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  toastMessage: { color: '#fff' },
});
