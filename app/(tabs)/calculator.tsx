import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Instagram, Share2, Edit3, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

type CaratType = '9K' | '18K' | '20K' | '22K';

const STORAGE_KEY = 'goldBasePrice' as const;
const CUSTOM_PRICES_KEY = 'customCaratPrices' as const;
const MIN_VALUE = 0;
const MAX_PURITY = 100;

type CustomPrices = {
  '9K'?: string;
  '18K'?: string;
  '20K'?: string;
  '22K'?: string;
};

export default function GoldCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const [basePrice, setBasePrice] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [makingCharge1, setMakingCharge1] = useState<string>('10');
  const [makingCharge2, setMakingCharge2] = useState<string>('12');
  const [makingCharge3, setMakingCharge3] = useState<string>('15');
  const [gstPercent, setGstPercent] = useState<string>('3');
  const [carat9Purity, setCarat9Purity] = useState<string>('38');
  const [carat18Purity, setCarat18Purity] = useState<string>('76');
  const [carat20Purity, setCarat20Purity] = useState<string>('84');
  const [carat22Purity, setCarat22Purity] = useState<string>('92');
  const [weight, setWeight] = useState<string>('');
  const [selectedCarat, setSelectedCarat] = useState<CaratType>('22K');
  const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(false);
  const [customPrices, setCustomPrices] = useState<CustomPrices>({});
  const [isEditingCustomPrices, setIsEditingCustomPrices] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sanitizeNumericInput = useCallback((text: string): string => {
    const sanitized = text.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
  }, []);

  const sanitizeNumber = useCallback((value: string, defaultValue: number = 0): number => {
    if (!value || typeof value !== 'string') return defaultValue;
    const trimmed = value.trim();
    if (trimmed.length === 0) return defaultValue;
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || !isFinite(parsed) || parsed < MIN_VALUE) return defaultValue;
    return parsed;
  }, []);

  const saveBasePrice = useCallback(async (price: string) => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      if (typeof price !== 'string') {
        if (__DEV__) {
          console.error('saveBasePrice: price is not a string:', typeof price, price);
        }
        return;
      }
      
      const trimmedPrice = price.trim();
      
      if (trimmedPrice.length === 0 || trimmedPrice === 'undefined' || trimmedPrice === 'null' || trimmedPrice === 'NaN' || trimmedPrice === '[object Object]') {
        if (__DEV__) {
          console.error('saveBasePrice: invalid trimmedPrice:', trimmedPrice);
        }
        return;
      }
      
      const numValue = parseFloat(trimmedPrice);
      
      if (isNaN(numValue) || !isFinite(numValue) || numValue < MIN_VALUE) {
        if (__DEV__) {
          console.error('saveBasePrice: invalid number:', numValue);
        }
        return;
      }
      
      if (__DEV__) {
        console.log('Saving base price:', trimmedPrice);
      }
      
      await AsyncStorage.setItem(STORAGE_KEY, trimmedPrice);
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving base price:', error);
      }
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  const loadCustomPrices = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CUSTOM_PRICES_KEY);
      if (saved && typeof saved === 'string') {
        const trimmed = saved.trim();
        if (trimmed && trimmed.length > 0 && trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setCustomPrices(parsed as CustomPrices);
            } else {
              if (__DEV__) {
                console.error('Invalid custom prices format, removing...');
              }
              await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
            }
          } catch (parseError) {
            if (__DEV__) {
              console.error('JSON parse error, removing corrupted data:', parseError);
            }
            await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
          }
        } else {
          if (__DEV__) {
            console.error('Non-JSON data found, removing...');
          }
          await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading custom prices:', error);
      }
      try {
        await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
      } catch (removeError) {
        if (__DEV__) {
          console.error('Error removing corrupted storage:', removeError);
        }
      }
    }
  }, []);

  const saveCustomPrices = useCallback(async (prices: CustomPrices) => {
    try {
      if (Object.keys(prices).length === 0) {
        await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
      } else {
        await AsyncStorage.setItem(CUSTOM_PRICES_KEY, JSON.stringify(prices));
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving custom prices:', error);
      }
    }
  }, []);

  const loadBasePrice = useCallback(async () => {
    if (__DEV__) {
      console.log('Loading base price from AsyncStorage...');
    }
    try {
      let savedPrice = null;
      
      try {
        let rawValue = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (__DEV__) {
          console.log('Loaded rawValue:', typeof rawValue, rawValue);
        }
        
        if (rawValue === null || rawValue === undefined) {
          setBasePrice('0');
          setIsLoading(false);
          return;
        }
        
        if (typeof rawValue !== 'string') {
          if (__DEV__) {
            console.error('AsyncStorage returned non-string:', typeof rawValue);
          }
          await AsyncStorage.removeItem(STORAGE_KEY);
          setBasePrice('0');
          setIsLoading(false);
          return;
        }
        
        const trimmed = rawValue.trim();
        
        if (trimmed.length === 0) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setBasePrice('0');
          setIsLoading(false);
          return;
        }
        
        const firstChar = trimmed.charAt(0);
        if (!firstChar.match(/[0-9]/)) {
          if (__DEV__) {
            console.log('Detected invalid storage (starts with non-digit), clearing...');
          }
          await AsyncStorage.removeItem(STORAGE_KEY);
          setBasePrice('0');
          setIsLoading(false);
          return;
        }
        
        savedPrice = trimmed;
      } catch (storageError) {
        if (__DEV__) {
          console.error('AsyncStorage read error:', storageError);
        }
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
          if (__DEV__) {
            console.log('Removed corrupted storage item');
          }
        } catch (clearError) {
          if (__DEV__) {
            console.error('Failed to remove storage item:', clearError);
          }
        }
        setBasePrice('0');
        setIsLoading(false);
        return;
      }
      
      if (!savedPrice || savedPrice === 'null' || savedPrice === 'undefined') {
        setBasePrice('0');
        setIsLoading(false);
        return;
      }
      
      if (savedPrice.includes('[object') || savedPrice.includes('{') || savedPrice.includes('}')) {
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (removeError) {
          if (__DEV__) {
            console.error('Failed to remove invalid data:', removeError);
          }
        }
        setBasePrice('0');
        setIsLoading(false);
        return;
      }
      
      const numValue = parseFloat(savedPrice);
      if (isNaN(numValue) || !isFinite(numValue) || numValue < MIN_VALUE) {
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (removeError) {
          if (__DEV__) {
            console.error('Failed to remove invalid number:', removeError);
          }
        }
        setBasePrice('0');
        setIsLoading(false);
        return;
      }
      
      setBasePrice(savedPrice);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading base price:', error);
      }
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch (removeError) {
        if (__DEV__) {
          console.error('Error removing corrupted storage:', removeError);
        }
      }
      setBasePrice('0');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        await loadBasePrice();
        await loadCustomPrices();
      } catch (error) {
        if (__DEV__) {
          console.error('Error initializing data:', error);
        }
        setBasePrice('0');
        setIsLoading(false);
      }
    };
    
    initData();
  }, [loadBasePrice, loadCustomPrices]);

  useEffect(() => {
    saveCustomPrices(customPrices);
  }, [customPrices, saveCustomPrices]);

  useEffect(() => {
    if (!isLoading && basePrice) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveBasePrice(basePrice);
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [basePrice, isLoading, saveBasePrice]);

  const basePriceNum = useMemo(() => sanitizeNumber(basePrice, 0), [basePrice, sanitizeNumber]);
  const mc1 = useMemo(() => sanitizeNumber(makingCharge1, 0), [makingCharge1, sanitizeNumber]);
  const mc2 = useMemo(() => sanitizeNumber(makingCharge2, 0), [makingCharge2, sanitizeNumber]);
  const mc3 = useMemo(() => sanitizeNumber(makingCharge3, 0), [makingCharge3, sanitizeNumber]);
  const gst = useMemo(() => sanitizeNumber(gstPercent, 0), [gstPercent, sanitizeNumber]);
  const weightNum = useMemo(() => sanitizeNumber(weight, 0), [weight, sanitizeNumber]);
  const purity9 = useMemo(() => {
    const val = sanitizeNumber(carat9Purity, 38);
    return Math.min(Math.max(val, MIN_VALUE), MAX_PURITY);
  }, [carat9Purity, sanitizeNumber]);
  const purity18 = useMemo(() => {
    const val = sanitizeNumber(carat18Purity, 76);
    return Math.min(Math.max(val, MIN_VALUE), MAX_PURITY);
  }, [carat18Purity, sanitizeNumber]);
  const purity20 = useMemo(() => {
    const val = sanitizeNumber(carat20Purity, 84);
    return Math.min(Math.max(val, MIN_VALUE), MAX_PURITY);
  }, [carat20Purity, sanitizeNumber]);
  const purity22 = useMemo(() => {
    const val = sanitizeNumber(carat22Purity, 92);
    return Math.min(Math.max(val, MIN_VALUE), MAX_PURITY);
  }, [carat22Purity, sanitizeNumber]);

  const calculatedCarat9Price = useMemo(() => Math.round((basePriceNum * purity9) / 100), [basePriceNum, purity9]);
  const calculatedCarat18Price = useMemo(() => Math.round((basePriceNum * purity18) / 100), [basePriceNum, purity18]);
  const calculatedCarat20Price = useMemo(() => Math.round((basePriceNum * purity20) / 100), [basePriceNum, purity20]);
  const calculatedCarat22Price = useMemo(() => Math.round((basePriceNum * purity22) / 100), [basePriceNum, purity22]);

  const carat9Price = useMemo(() => {
    const custom = sanitizeNumber(customPrices['9K'] || '', 0);
    return custom > 0 ? custom : calculatedCarat9Price;
  }, [customPrices, calculatedCarat9Price, sanitizeNumber]);

  const carat18Price = useMemo(() => {
    const custom = sanitizeNumber(customPrices['18K'] || '', 0);
    return custom > 0 ? custom : calculatedCarat18Price;
  }, [customPrices, calculatedCarat18Price, sanitizeNumber]);

  const carat20Price = useMemo(() => {
    const custom = sanitizeNumber(customPrices['20K'] || '', 0);
    return custom > 0 ? custom : calculatedCarat20Price;
  }, [customPrices, calculatedCarat20Price, sanitizeNumber]);

  const carat22Price = useMemo(() => {
    const custom = sanitizeNumber(customPrices['22K'] || '', 0);
    return custom > 0 ? custom : calculatedCarat22Price;
  }, [customPrices, calculatedCarat22Price, sanitizeNumber]);

  const getCaratPrice = useCallback((): number => {
    switch (selectedCarat) {
      case '9K':
        return carat9Price;
      case '18K':
        return carat18Price;
      case '20K':
        return carat20Price;
      case '22K':
        return carat22Price;
      default:
        return carat22Price;
    }
  }, [selectedCarat, carat9Price, carat18Price, carat20Price, carat22Price]);

  const calculateFinalPrice = useCallback((makingChargePercent: number) => {
    try {
      const caratPrice = getCaratPrice();
      if (!isFinite(caratPrice) || caratPrice < 0) {
        return { goldPrice: 0, makingCharges: 0, gstAmount: 0, total: 0 };
      }
      
      const priceFor10g = caratPrice;
      const pricePerGram = priceFor10g / 10;
      const goldPrice = Math.round(pricePerGram * weightNum);
      const makingCharges = Math.round((goldPrice * makingChargePercent) / 100);
      const subtotal = goldPrice + makingCharges;
      const gstAmount = Math.round((subtotal * gst) / 100);
      const total = subtotal + gstAmount;

      return {
        goldPrice: isFinite(goldPrice) ? goldPrice : 0,
        makingCharges: isFinite(makingCharges) ? makingCharges : 0,
        gstAmount: isFinite(gstAmount) ? gstAmount : 0,
        total: isFinite(total) ? total : 0,
      };
    } catch (error) {
      if (__DEV__) {
        console.error('Error calculating price:', error);
      }
      return { goldPrice: 0, makingCharges: 0, gstAmount: 0, total: 0 };
    }
  }, [getCaratPrice, weightNum, gst]);

  const result1 = useMemo(() => calculateFinalPrice(mc1), [calculateFinalPrice, mc1]);
  const result2 = useMemo(() => calculateFinalPrice(mc2), [calculateFinalPrice, mc2]);
  const result3 = useMemo(() => calculateFinalPrice(mc3), [calculateFinalPrice, mc3]);

  const handleShareAllCaratPrices = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      
      const message = `Gold Rates\n\n9K: ₹${carat9Price} per 10g\n18K: ₹${carat18Price} per 10g\n20K: ₹${carat20Price} per 10g\n22K: ₹${carat22Price} per 10g\n\nDate: ${formattedDate}`;
      
      if (Platform.OS === 'web') {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = message;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '0';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            Alert.alert('Copied!', 'Gold rates copied to clipboard');
          } else {
            Alert.alert('Note', message);
          }
        } catch (err) {
          if (__DEV__) {
            console.error('Fallback copy failed:', err);
          }
          Alert.alert('Gold Rates', message);
        }
      } else {
        await Share.share({
          message,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error sharing:', error);
      }
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', 'Unable to share the prices');
    }
  }, [carat9Price, carat18Price, carat20Price, carat22Price]);

  const scrollToInput = useCallback((key: string) => {
    const inputRef = inputRefs.current[key];
    if (inputRef && scrollViewRef.current) {
      setTimeout(() => {
        try {
          if ('measure' in inputRef && typeof inputRef.measure === 'function') {
            inputRef.measure(
              (_fx: number, _fy: number, _width: number, _height: number, _px: number, py: number) => {
                const keyboardOffset = Platform.select({
                  ios: 100,
                  android: 250,
                  default: 100,
                });
                const scrollY = Math.max(0, py - keyboardOffset);
                scrollViewRef.current?.scrollTo({
                  y: scrollY,
                  animated: true,
                });
              }
            );
          }
        } catch (error) {
          if (__DEV__) {
            console.log('Scroll measurement error:', error);
          }
        }
      }, Platform.OS === 'android' ? 400 : 150);
    }
  }, []);

  const handleBasePriceChange = useCallback((text: string) => {
    setBasePrice(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleWeightChange = useCallback((text: string) => {
    setWeight(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleMakingCharge1Change = useCallback((text: string) => {
    setMakingCharge1(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleMakingCharge2Change = useCallback((text: string) => {
    setMakingCharge2(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleMakingCharge3Change = useCallback((text: string) => {
    setMakingCharge3(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleGstChange = useCallback((text: string) => {
    setGstPercent(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleCarat9Change = useCallback((text: string) => {
    setCarat9Purity(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleCarat18Change = useCallback((text: string) => {
    setCarat18Purity(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleCarat20Change = useCallback((text: string) => {
    setCarat20Purity(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleCarat22Change = useCallback((text: string) => {
    setCarat22Purity(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleCustomPriceChange = useCallback((carat: CaratType, value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setCustomPrices(prev => ({
      ...prev,
      [carat]: sanitized,
    }));
  }, [sanitizeNumericInput]);

  const resetCustomPrice = useCallback((carat: CaratType) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCustomPrices(prev => {
      const updated = { ...prev };
      delete updated[carat];
      return updated;
    });
  }, []);

  const resetAllCustomPrices = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCustomPrices({});
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1A0F0A', '#0D0805', '#000000', '#0A0503']}
        style={styles.gradient}
        locations={[0, 0.3, 0.7, 1]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { 
                paddingTop: insets.top + 12, 
                paddingBottom: insets.bottom + 90,
                maxWidth: isTablet ? 800 : undefined,
                alignSelf: isTablet ? 'center' : undefined,
                width: isTablet ? '100%' : undefined,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => Keyboard.dismiss()}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.mainTitle} testID="main-title">Gold Price Calculator</Text>
            </View>

            <TouchableOpacity
              style={styles.settingsToggle}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setIsSettingsExpanded(!isSettingsExpanded);
              }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={isSettingsExpanded ? "Collapse settings" : "Expand settings"}
              accessibilityState={{ expanded: isSettingsExpanded }}
              testID="settings-toggle"
            >
              <Text style={styles.settingsToggleText}>Settings</Text>
              {isSettingsExpanded ? (
                <ChevronUp size={18} color="#DAA520" />
              ) : (
                <ChevronDown size={18} color="#DAA520" />
              )}
            </TouchableOpacity>

            {isSettingsExpanded && (
              <>
              <View style={styles.editableSection}>
              <Text style={styles.sectionTitle}>Base Settings</Text>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>24K Gold Price (per 10g)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    ref={(ref) => { inputRefs.current['basePrice'] = ref; }}
                    style={styles.input}
                    value={basePrice}
                    onChangeText={handleBasePriceChange}
                    keyboardType="numeric"
                    placeholderTextColor="#666"
                    onFocus={() => scrollToInput('basePrice')}
                    accessible={true}
                    accessibilityLabel="24K Gold Price per 10 grams"
                    accessibilityHint="Enter the base price for 24 karat gold per 10 grams"
                    returnKeyType="done"
                    maxLength={10}
                  />
                </View>
              </View>

              <View style={styles.caratPricesContainer}>
                <View style={styles.caratPriceBox}>
                  <Text style={styles.caratLabel}>9K</Text>
                  <View style={styles.purityInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['carat9'] = ref; }}
                      style={styles.purityInput}
                      value={carat9Purity}
                      onChangeText={handleCarat9Change}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('carat9')}
                      accessible={true}
                      accessibilityLabel="9K purity percentage"
                      accessibilityHint="Enter purity percentage for 9 karat gold, maximum 100"
                      returnKeyType="done"
                      maxLength={5}
                    />
                    <Text style={styles.puritySymbol}>%</Text>
                  </View>
                  <Text style={styles.caratPrice}>₹{calculatedCarat9Price}</Text>
                </View>
                <View style={styles.caratPriceBox}>
                  <Text style={styles.caratLabel}>18K</Text>
                  <View style={styles.purityInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['carat18'] = ref; }}
                      style={styles.purityInput}
                      value={carat18Purity}
                      onChangeText={handleCarat18Change}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('carat18')}
                      accessible={true}
                      accessibilityLabel="18K purity percentage"
                      accessibilityHint="Enter purity percentage for 18 karat gold, maximum 100"
                      returnKeyType="done"
                      maxLength={5}
                    />
                    <Text style={styles.puritySymbol}>%</Text>
                  </View>
                  <Text style={styles.caratPrice}>₹{calculatedCarat18Price}</Text>
                </View>
                <View style={styles.caratPriceBox}>
                  <Text style={styles.caratLabel}>20K</Text>
                  <View style={styles.purityInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['carat20'] = ref; }}
                      style={styles.purityInput}
                      value={carat20Purity}
                      onChangeText={handleCarat20Change}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('carat20')}
                      accessible={true}
                      accessibilityLabel="20K purity percentage"
                      accessibilityHint="Enter purity percentage for 20 karat gold, maximum 100"
                      returnKeyType="done"
                      maxLength={5}
                    />
                    <Text style={styles.puritySymbol}>%</Text>
                  </View>
                  <Text style={styles.caratPrice}>₹{calculatedCarat20Price}</Text>
                </View>
                <View style={styles.caratPriceBox}>
                  <Text style={styles.caratLabel}>22K</Text>
                  <View style={styles.purityInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['carat22'] = ref; }}
                      style={styles.purityInput}
                      value={carat22Purity}
                      onChangeText={handleCarat22Change}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('carat22')}
                      accessible={true}
                      accessibilityLabel="22K purity percentage"
                      accessibilityHint="Enter purity percentage for 22 karat gold, maximum 100"
                      returnKeyType="done"
                      maxLength={5}
                    />
                    <Text style={styles.puritySymbol}>%</Text>
                  </View>
                  <Text style={styles.caratPrice}>₹{calculatedCarat22Price}</Text>
                </View>
              </View>

              <View style={styles.customPriceSection}>
                <View style={styles.customPriceHeader}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Custom Carat Prices</Text>
                  <TouchableOpacity
                    style={styles.editCustomButton}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setIsEditingCustomPrices(!isEditingCustomPrices);
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={isEditingCustomPrices ? "Stop editing custom prices" : "Edit custom prices"}
                  >
                    <Edit3 size={16} color="#FFD700" />
                    <Text style={styles.editCustomButtonText}>
                      {isEditingCustomPrices ? 'Done' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isEditingCustomPrices && (
                  <>
                    <Text style={styles.customPriceHelp}>
                      Override calculated prices. Leave empty to use calculated values.
                    </Text>
                    <View style={styles.customPricesGrid}>
                      <View style={styles.customPriceInputBox}>
                        <View style={styles.customPriceBoxHeader}>
                          <Text style={styles.customPriceLabel}>9K</Text>
                          {customPrices['9K'] && (
                            <TouchableOpacity
                              onPress={() => resetCustomPrice('9K')}
                              style={styles.resetButton}
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel="Reset 9K custom price"
                            >
                              <RefreshCw size={12} color="#FF6B6B" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.customPriceInputWrapper}>
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput
                            ref={(ref) => { inputRefs.current['custom9'] = ref; }}
                            style={styles.customPriceInput}
                            value={customPrices['9K'] || ''}
                            onChangeText={(text) => handleCustomPriceChange('9K', text)}
                            keyboardType="numeric"
                            placeholder={String(calculatedCarat9Price)}
                            placeholderTextColor="#666"
                            onFocus={() => scrollToInput('custom9')}
                            accessible={true}
                            accessibilityLabel="Custom 9K gold price"
                            returnKeyType="done"
                            maxLength={10}
                          />
                        </View>
                      </View>

                      <View style={styles.customPriceInputBox}>
                        <View style={styles.customPriceBoxHeader}>
                          <Text style={styles.customPriceLabel}>18K</Text>
                          {customPrices['18K'] && (
                            <TouchableOpacity
                              onPress={() => resetCustomPrice('18K')}
                              style={styles.resetButton}
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel="Reset 18K custom price"
                            >
                              <RefreshCw size={12} color="#FF6B6B" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.customPriceInputWrapper}>
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput
                            ref={(ref) => { inputRefs.current['custom18'] = ref; }}
                            style={styles.customPriceInput}
                            value={customPrices['18K'] || ''}
                            onChangeText={(text) => handleCustomPriceChange('18K', text)}
                            keyboardType="numeric"
                            placeholder={String(calculatedCarat18Price)}
                            placeholderTextColor="#666"
                            onFocus={() => scrollToInput('custom18')}
                            accessible={true}
                            accessibilityLabel="Custom 18K gold price"
                            returnKeyType="done"
                            maxLength={10}
                          />
                        </View>
                      </View>

                      <View style={styles.customPriceInputBox}>
                        <View style={styles.customPriceBoxHeader}>
                          <Text style={styles.customPriceLabel}>20K</Text>
                          {customPrices['20K'] && (
                            <TouchableOpacity
                              onPress={() => resetCustomPrice('20K')}
                              style={styles.resetButton}
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel="Reset 20K custom price"
                            >
                              <RefreshCw size={12} color="#FF6B6B" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.customPriceInputWrapper}>
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput
                            ref={(ref) => { inputRefs.current['custom20'] = ref; }}
                            style={styles.customPriceInput}
                            value={customPrices['20K'] || ''}
                            onChangeText={(text) => handleCustomPriceChange('20K', text)}
                            keyboardType="numeric"
                            placeholder={String(calculatedCarat20Price)}
                            placeholderTextColor="#666"
                            onFocus={() => scrollToInput('custom20')}
                            accessible={true}
                            accessibilityLabel="Custom 20K gold price"
                            returnKeyType="done"
                            maxLength={10}
                          />
                        </View>
                      </View>

                      <View style={styles.customPriceInputBox}>
                        <View style={styles.customPriceBoxHeader}>
                          <Text style={styles.customPriceLabel}>22K</Text>
                          {customPrices['22K'] && (
                            <TouchableOpacity
                              onPress={() => resetCustomPrice('22K')}
                              style={styles.resetButton}
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel="Reset 22K custom price"
                            >
                              <RefreshCw size={12} color="#FF6B6B" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.customPriceInputWrapper}>
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput
                            ref={(ref) => { inputRefs.current['custom22'] = ref; }}
                            style={styles.customPriceInput}
                            value={customPrices['22K'] || ''}
                            onChangeText={(text) => handleCustomPriceChange('22K', text)}
                            keyboardType="numeric"
                            placeholder={String(calculatedCarat22Price)}
                            placeholderTextColor="#666"
                            onFocus={() => scrollToInput('custom22')}
                            accessible={true}
                            accessibilityLabel="Custom 22K gold price"
                            returnKeyType="done"
                            maxLength={10}
                          />
                        </View>
                      </View>
                    </View>

                    {Object.keys(customPrices).length > 0 && (
                      <TouchableOpacity
                        style={styles.resetAllButton}
                        onPress={resetAllCustomPrices}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Reset all custom prices"
                      >
                        <RefreshCw size={14} color="#FF6B6B" />
                        <Text style={styles.resetAllButtonText}>Reset All Custom Prices</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {!isEditingCustomPrices && Object.keys(customPrices).length > 0 && (
                  <View style={styles.activeCustomPricesContainer}>
                    <Text style={styles.activeCustomPricesLabel}>Active Custom Prices:</Text>
                    <View style={styles.activeCustomPricesList}>
                      {(Object.keys(customPrices) as CaratType[]).map((carat) => {
                        const customVal = customPrices[carat];
                        if (!customVal) return null;
                        return (
                          <View key={carat} style={styles.activeCustomPriceItem}>
                            <Text style={styles.activeCustomPriceText}>
                              {carat}: ₹{sanitizeNumber(customVal, 0)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              <Text style={[styles.sectionTitle, styles.marginTop]}>
                Making Charges & GST
              </Text>

              <View style={styles.chargesGrid}>
                <View style={styles.chargeInputBox}>
                  <Text style={styles.chargeLabel}>Making 1</Text>
                  <View style={styles.percentInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['making1'] = ref; }}
                      style={styles.percentInput}
                      value={makingCharge1}
                      onChangeText={handleMakingCharge1Change}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('making1')}
                      accessible={true}
                      accessibilityLabel="Making charge 1 percentage"
                      accessibilityHint="Enter first making charge percentage"
                      returnKeyType="done"
                      maxLength={6}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>

                <View style={styles.chargeInputBox}>
                  <Text style={styles.chargeLabel}>Making 2</Text>
                  <View style={styles.percentInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['making2'] = ref; }}
                      style={styles.percentInput}
                      value={makingCharge2}
                      onChangeText={handleMakingCharge2Change}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('making2')}
                      accessible={true}
                      accessibilityLabel="Making charge 2 percentage"
                      accessibilityHint="Enter second making charge percentage"
                      returnKeyType="done"
                      maxLength={6}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>

                <View style={styles.chargeInputBox}>
                  <Text style={styles.chargeLabel}>Making 3</Text>
                  <View style={styles.percentInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['making3'] = ref; }}
                      style={styles.percentInput}
                      value={makingCharge3}
                      onChangeText={handleMakingCharge3Change}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('making3')}
                      accessible={true}
                      accessibilityLabel="Making charge 3 percentage"
                      accessibilityHint="Enter third making charge percentage"
                      returnKeyType="done"
                      maxLength={6}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>

                <View style={styles.chargeInputBox}>
                  <Text style={styles.chargeLabel}>GST</Text>
                  <View style={styles.percentInputWrapper}>
                    <TextInput
                      ref={(ref) => { inputRefs.current['gst'] = ref; }}
                      style={styles.percentInput}
                      value={gstPercent}
                      onChangeText={handleGstChange}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                      onFocus={() => scrollToInput('gst')}
                      accessible={true}
                      accessibilityLabel="GST percentage"
                      accessibilityHint="Enter GST percentage"
                      returnKeyType="done"
                      maxLength={5}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>
              </View>
            </View>

              </>
            )}

            {isSettingsExpanded && (
              <>
                <View style={styles.creatorSection}>
                  <View style={styles.creatorDivider} />
                  <Text style={styles.creatorLabel}>App Creator</Text>
                  <Text style={styles.creatorName}>Sagar Hazra</Text>
                  <View style={styles.creatorContact}>
                    <Text style={styles.creatorEmail}>10sagarhazra@gmail.com</Text>
                    <View style={styles.creatorSeparator} />
                    <View style={styles.instagramContainer}>
                      <Instagram size={12} color="#E1306C" />
                      <Text style={styles.instagramUsername}>sagarhazra</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.privacyNotice}>
                  <Text style={styles.privacyText}>
                    Data stored locally • No external servers
                  </Text>
                </View>
              </>
            )}

            {!isSettingsExpanded && (
              <>
            <View style={styles.divider} />

            <View style={styles.basePriceDisplay}>
              <Text style={styles.basePriceLabel}>(24K Gold)</Text>
              <View style={styles.basePriceEditWrapper}>
                <Text style={styles.basePriceCurrency}>₹</Text>
                <TextInput
                  ref={(ref) => { inputRefs.current['basePriceMain'] = ref; }}
                  style={[
                    styles.basePriceInput,
                    basePrice.length > 7 && styles.basePriceInputSmall,
                    basePrice.length > 9 && styles.basePriceInputTiny,
                  ]}
                  value={basePrice}
                  onChangeText={handleBasePriceChange}
                  keyboardType="numeric"
                  placeholderTextColor="#8B7355"
                  onFocus={() => scrollToInput('basePriceMain')}
                  accessible={true}
                  accessibilityLabel="Base price for 24K gold"
                  accessibilityHint="Enter the base price for 24 karat gold per 10 grams"
                  returnKeyType="done"
                  maxLength={10}
                />
                <Text style={styles.basePriceUnit}>/ 10g</Text>
              </View>
            </View>

            <View style={styles.caratPricesMain}>
              <View style={styles.caratPriceMainBox}>
                <Text style={styles.caratMainLabel}>9K</Text>
                <Text 
                  style={[
                    styles.caratMainPrice,
                    String(carat9Price).length > 5 && styles.caratMainPriceSmall,
                    String(carat9Price).length > 7 && styles.caratMainPriceTiny,
                    String(carat9Price).length > 9 && styles.caratMainPriceMicro,
                  ]} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit
                >
                  ₹{carat9Price}
                </Text>
                <Text style={styles.caratMainSubtext}>
                  {customPrices['9K'] ? 'Custom' : `(${purity9}%) purity`}
                </Text>
              </View>
              <View style={styles.caratPriceMainBox}>
                <Text style={styles.caratMainLabel}>18K</Text>
                <Text 
                  style={[
                    styles.caratMainPrice,
                    String(carat18Price).length > 5 && styles.caratMainPriceSmall,
                    String(carat18Price).length > 7 && styles.caratMainPriceTiny,
                    String(carat18Price).length > 9 && styles.caratMainPriceMicro,
                  ]} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit
                >
                  ₹{carat18Price}
                </Text>
                <Text style={styles.caratMainSubtext}>
                  {customPrices['18K'] ? 'Custom' : `(${purity18}%) purity`}
                </Text>
              </View>
              <View style={styles.caratPriceMainBox}>
                <Text style={styles.caratMainLabel}>20K</Text>
                <Text 
                  style={[
                    styles.caratMainPrice,
                    String(carat20Price).length > 5 && styles.caratMainPriceSmall,
                    String(carat20Price).length > 7 && styles.caratMainPriceTiny,
                    String(carat20Price).length > 9 && styles.caratMainPriceMicro,
                  ]} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit
                >
                  ₹{carat20Price}
                </Text>
                <Text style={styles.caratMainSubtext}>
                  {customPrices['20K'] ? 'Custom' : `(${purity20}%) purity`}
                </Text>
              </View>
              <View style={styles.caratPriceMainBox}>
                <Text style={styles.caratMainLabel}>22K</Text>
                <Text 
                  style={[
                    styles.caratMainPrice,
                    String(carat22Price).length > 5 && styles.caratMainPriceSmall,
                    String(carat22Price).length > 7 && styles.caratMainPriceTiny,
                    String(carat22Price).length > 9 && styles.caratMainPriceMicro,
                  ]} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit
                >
                  ₹{carat22Price}
                </Text>
                <Text style={styles.caratMainSubtext}>
                  {customPrices['22K'] ? 'Custom' : `(${purity22}%) purity`}
                </Text>
              </View>
            </View>

            <View style={styles.shareAllContainer}>
              <View style={styles.shareAllDividerLine} />
              <TouchableOpacity
                style={styles.shareAllButton}
                onPress={handleShareAllCaratPrices}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Share all gold prices"
              >
                <Share2 size={18} color="#FFD700" strokeWidth={2.5} />
                <Text style={styles.shareAllText}>Share Rates</Text>
              </TouchableOpacity>
              <View style={styles.shareAllDividerLine} />
            </View>

            <Text style={styles.sectionTitle}>Calculate Price</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Weight (grams)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={(ref) => { inputRefs.current['weight'] = ref; }}
                  style={styles.input}
                  value={weight}
                  onChangeText={handleWeightChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                  onFocus={() => scrollToInput('weight')}
                  accessible={true}
                  accessibilityLabel="Weight in grams"
                  accessibilityHint="Enter the weight of gold in grams"
                  returnKeyType="done"
                  maxLength={10}
                />
                <Text style={styles.unitText}>g</Text>
              </View>
            </View>

            <Text style={[styles.inputLabel, styles.selectCaratLabel]}>Select Carat</Text>
            <View style={styles.caratSelector}>
              <TouchableOpacity
                style={[
                  styles.caratButton,
                  selectedCarat === '9K' && styles.caratButtonActive,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setSelectedCarat('9K');
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="9 Karat gold"
                accessibilityState={{ selected: selectedCarat === '9K' }}
              >
                <Text
                  style={[
                    styles.caratButtonText,
                    selectedCarat === '9K' && styles.caratButtonTextActive,
                  ]}
                >
                  9K
                </Text>
                <Text style={[styles.purityLabel, selectedCarat === '9K' && styles.purityLabelActive]}>Purity: {purity9}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.caratButton,
                  selectedCarat === '18K' && styles.caratButtonActive,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setSelectedCarat('18K');
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="18 Karat gold"
                accessibilityState={{ selected: selectedCarat === '18K' }}
              >
                <Text
                  style={[
                    styles.caratButtonText,
                    selectedCarat === '18K' && styles.caratButtonTextActive,
                  ]}
                >
                  18K
                </Text>
                <Text style={[styles.purityLabel, selectedCarat === '18K' && styles.purityLabelActive]}>Purity: {purity18}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.caratButton,
                  selectedCarat === '20K' && styles.caratButtonActive,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setSelectedCarat('20K');
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="20 Karat gold"
                accessibilityState={{ selected: selectedCarat === '20K' }}
              >
                <Text
                  style={[
                    styles.caratButtonText,
                    selectedCarat === '20K' && styles.caratButtonTextActive,
                  ]}
                >
                  20K
                </Text>
                <Text style={[styles.purityLabel, selectedCarat === '20K' && styles.purityLabelActive]}>Purity: {purity20}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.caratButton,
                  selectedCarat === '22K' && styles.caratButtonActive,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setSelectedCarat('22K');
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="22 Karat gold"
                accessibilityState={{ selected: selectedCarat === '22K' }}
              >
                <Text
                  style={[
                    styles.caratButtonText,
                    selectedCarat === '22K' && styles.caratButtonTextActive,
                  ]}
                >
                  22K
                </Text>
                <Text style={[styles.purityLabel, selectedCarat === '22K' && styles.purityLabelActive]}>Purity: {purity22}%</Text>
              </TouchableOpacity>
            </View>

            {weightNum > 0 && (
              <>
                <Text style={[styles.sectionTitle, styles.marginTop]}>
                  Price Breakdown
                </Text>

                <View style={styles.resultsContainer}>
                  <View style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultTitle}>
                        Making Charges {mc1}%
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Gold Price</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result1.goldPrice).length > 5 && styles.resultValueSmall,
                          String(result1.goldPrice).length > 7 && styles.resultValueTiny,
                          String(result1.goldPrice).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result1.goldPrice}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Making Charges</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result1.makingCharges).length > 5 && styles.resultValueSmall,
                          String(result1.makingCharges).length > 7 && styles.resultValueTiny,
                          String(result1.makingCharges).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result1.makingCharges}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>GST ({gst}%)</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result1.gstAmount).length > 5 && styles.resultValueSmall,
                          String(result1.gstAmount).length > 7 && styles.resultValueTiny,
                          String(result1.gstAmount).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result1.gstAmount}
                      </Text>
                    </View>
                    <View style={styles.resultDivider} />
                    <View style={styles.resultRow}>
                      <Text style={styles.resultTotalLabel}>Total</Text>
                      <Text 
                        style={[
                          styles.resultTotalValue,
                          String(result1.total).length > 6 && styles.resultTotalValueSmall,
                          String(result1.total).length > 8 && styles.resultTotalValueTiny,
                          String(result1.total).length > 10 && styles.resultTotalValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result1.total}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultTitle}>
                        Making Charges {mc2}%
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Gold Price</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result2.goldPrice).length > 5 && styles.resultValueSmall,
                          String(result2.goldPrice).length > 7 && styles.resultValueTiny,
                          String(result2.goldPrice).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result2.goldPrice}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Making Charges</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result2.makingCharges).length > 5 && styles.resultValueSmall,
                          String(result2.makingCharges).length > 7 && styles.resultValueTiny,
                          String(result2.makingCharges).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result2.makingCharges}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>GST ({gst}%)</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result2.gstAmount).length > 5 && styles.resultValueSmall,
                          String(result2.gstAmount).length > 7 && styles.resultValueTiny,
                          String(result2.gstAmount).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result2.gstAmount}
                      </Text>
                    </View>
                    <View style={styles.resultDivider} />
                    <View style={styles.resultRow}>
                      <Text style={styles.resultTotalLabel}>Total</Text>
                      <Text 
                        style={[
                          styles.resultTotalValue,
                          String(result2.total).length > 6 && styles.resultTotalValueSmall,
                          String(result2.total).length > 8 && styles.resultTotalValueTiny,
                          String(result2.total).length > 10 && styles.resultTotalValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result2.total}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultTitle}>
                        Making Charges {mc3}%
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Gold Price</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result3.goldPrice).length > 5 && styles.resultValueSmall,
                          String(result3.goldPrice).length > 7 && styles.resultValueTiny,
                          String(result3.goldPrice).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result3.goldPrice}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Making Charges</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result3.makingCharges).length > 5 && styles.resultValueSmall,
                          String(result3.makingCharges).length > 7 && styles.resultValueTiny,
                          String(result3.makingCharges).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result3.makingCharges}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>GST ({gst}%)</Text>
                      <Text 
                        style={[
                          styles.resultValue,
                          String(result3.gstAmount).length > 5 && styles.resultValueSmall,
                          String(result3.gstAmount).length > 7 && styles.resultValueTiny,
                          String(result3.gstAmount).length > 9 && styles.resultValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result3.gstAmount}
                      </Text>
                    </View>
                    <View style={styles.resultDivider} />
                    <View style={styles.resultRow}>
                      <Text style={styles.resultTotalLabel}>Total</Text>
                      <Text 
                        style={[
                          styles.resultTotalValue,
                          String(result3.total).length > 6 && styles.resultTotalValueSmall,
                          String(result3.total).length > 8 && styles.resultTotalValueTiny,
                          String(result3.total).length > 10 && styles.resultTotalValueMicro,
                        ]} 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        ₹{result3.total}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
            </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  settingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.5)',
    borderLeftColor: 'rgba(255, 185, 50, 0.3)',
    borderRightColor: 'rgba(205, 127, 50, 0.3)',
    borderBottomColor: 'rgba(184, 115, 51, 0.5)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  settingsToggleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFD700',
    letterSpacing: 1,
    marginRight: 8,
  },
  editableSection: {
    backgroundColor: 'rgba(26, 15, 10, 0.9)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
    borderLeftColor: 'rgba(255, 185, 50, 0.2)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFD700',
    marginBottom: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  marginTop: {
    marginTop: 8,
  },
  inputRow: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 10,
    color: '#FFB347',
    marginBottom: 5,
    fontWeight: '500' as const,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 10, 5, 0.95)',
    borderRadius: 10,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    borderLeftColor: 'rgba(255, 185, 50, 0.3)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
    paddingHorizontal: 12,
    height: 40,
  },
  currencySymbol: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600' as const,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  unitText: {
    fontSize: 14,
    color: '#FFB347',
    fontWeight: '600' as const,
    marginLeft: 8,
    textAlign: 'center',
  },
  caratPricesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  caratPriceBox: {
    flex: 1,
    backgroundColor: 'rgba(30, 18, 10, 0.9)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.35)',
    borderLeftColor: 'rgba(205, 127, 50, 0.25)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caratLabel: {
    fontSize: 10,
    color: '#FFB347',
    marginBottom: 4,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  purityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 5, 0, 0.8)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.5)',
  },
  purityInput: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600' as const,
    width: 28,
    textAlign: 'center',
  },
  puritySymbol: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600' as const,
    marginLeft: 2,
    textAlign: 'center',
  },
  caratPrice: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  chargesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  chargeInputBox: {
    width: '48%',
    backgroundColor: 'rgba(30, 18, 10, 0.9)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.35)',
    borderLeftColor: 'rgba(205, 127, 50, 0.25)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.35)',
    alignItems: 'stretch',
  },
  chargeLabel: {
    fontSize: 10,
    color: '#FFB347',
    marginBottom: 6,
    fontWeight: '500' as const,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  percentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 5, 0, 0.85)',
    borderRadius: 7,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.5)',
  },
  percentInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  percentSymbol: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600' as const,
    marginLeft: 4,
    textAlign: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(255, 140, 0, 0.35)',
    marginVertical: 12,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  selectCaratLabel: {
    marginTop: 8,
    marginBottom: 8,
  },
  caratSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  caratButton: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 8, 0.98)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderTopColor: 'rgba(139, 69, 19, 0.4)',
    borderLeftColor: 'rgba(160, 82, 45, 0.3)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  caratButtonActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.35)',
    borderWidth: 4,
    borderTopColor: '#FFD700',
    borderLeftColor: '#FF8C00',
    borderRightColor: '#CD853F',
    borderBottomColor: '#B8860B',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 12,
    transform: [{ scale: 1.08 }, { translateY: -4 }],
  },
  caratButtonText: {
    fontSize: 14,
    color: '#A0826D',
    fontWeight: '600' as const,
    marginBottom: 3,
    textAlign: 'center',
  },
  caratButtonTextActive: {
    color: '#FFD700',
    fontWeight: '800' as const,
    fontSize: 16,
    textAlign: 'center',
  },
  purityLabel: {
    fontSize: 9,
    color: '#8B7355',
    fontWeight: '500' as const,
    marginTop: 1,
    textAlign: 'center',
  },
  purityLabelActive: {
    color: '#FFD700',
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  resultsContainer: {
    gap: 12,
  },
  resultCard: {
    backgroundColor: 'rgba(26, 15, 10, 0.98)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 3,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    borderLeftColor: 'rgba(255, 165, 0, 0.35)',
    borderRightColor: 'rgba(205, 127, 50, 0.35)',
    borderBottomColor: 'rgba(184, 115, 51, 0.45)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  resultHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 140, 0, 0.4)',
  },
  resultTitle: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '700' as const,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  resultLabel: {
    fontSize: 12,
    color: '#FFB347',
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  resultValue: {
    fontSize: 14,
    color: '#FFF5E6',
    fontWeight: '600' as const,
    textAlign: 'center',
    minWidth: 80,
  },
  resultDivider: {
    height: 2,
    backgroundColor: 'rgba(255, 140, 0, 0.35)',
    marginVertical: 6,
  },
  resultTotalLabel: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  resultTotalValue: {
    fontSize: 17,
    color: '#FFD700',
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textAlign: 'center',
    minWidth: 80,
  },
  resultTotalValueSmall: {
    fontSize: 16,
  },
  resultTotalValueTiny: {
    fontSize: 13,
  },
  resultTotalValueMicro: {
    fontSize: 11,
  },
  resultValueSmall: {
    fontSize: 13,
  },
  resultValueTiny: {
    fontSize: 11,
  },
  resultValueMicro: {
    fontSize: 9,
  },
  basePriceDisplay: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 3,
    borderTopColor: 'rgba(255, 215, 0, 0.65)',
    borderLeftColor: 'rgba(255, 185, 50, 0.5)',
    borderRightColor: 'rgba(205, 127, 50, 0.45)',
    borderBottomColor: 'rgba(184, 115, 51, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  basePriceLabel: {
    fontSize: 11,
    color: '#FFB347',
    fontWeight: '600' as const,
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  basePriceEditWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 5, 0, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.5)',
    borderLeftColor: 'rgba(255, 140, 0, 0.4)',
    borderRightColor: 'rgba(139, 69, 19, 0.4)',
    borderBottomColor: 'rgba(160, 82, 45, 0.5)',
  },
  basePriceCurrency: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: '700' as const,
    marginRight: 4,
  },
  basePriceInput: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: '700' as const,
    letterSpacing: 1,
    minWidth: 90,
    textAlign: 'center',
  },
  basePriceInputSmall: {
    fontSize: 16,
  },
  basePriceInputTiny: {
    fontSize: 12,
  },
  basePriceUnit: {
    fontSize: 14,
    color: '#FFB347',
    fontWeight: '600' as const,
    marginLeft: 4,
    textAlign: 'center',
  },
  caratPricesMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  caratPriceMainBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 3,
    borderTopColor: 'rgba(255, 215, 0, 0.55)',
    borderLeftColor: 'rgba(255, 185, 50, 0.4)',
    borderRightColor: 'rgba(205, 127, 50, 0.4)',
    borderBottomColor: 'rgba(184, 115, 51, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  caratMainLabel: {
    fontSize: 12,
    color: '#FFB347',
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  caratMainPrice: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '700' as const,
    marginBottom: 2,
    textAlign: 'center',
  },
  caratMainPriceSmall: {
    fontSize: 13,
  },
  caratMainPriceTiny: {
    fontSize: 10,
  },
  caratMainPriceMicro: {
    fontSize: 8,
  },
  caratMainSubtext: {
    fontSize: 9,
    color: '#B8956A',
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  shareButton: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  shareAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  shareAllDividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 140, 0, 0.25)',
  },
  shareAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 140, 0, 0.25)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.6)',
    borderLeftColor: 'rgba(255, 185, 50, 0.45)',
    borderRightColor: 'rgba(205, 127, 50, 0.45)',
    borderBottomColor: 'rgba(184, 115, 51, 0.6)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  shareAllText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 1,
  },
  creatorSection: {
    backgroundColor: 'rgba(13, 8, 5, 0.6)',
    borderRadius: 10,
    padding: 10,
    paddingTop: 12,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.15)',
    alignItems: 'center',
  },
  creatorDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    marginBottom: 10,
  },
  creatorLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: '#8B7355',
    marginBottom: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  creatorName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFB347',
    marginBottom: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  creatorContact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  creatorEmail: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#8B7355',
    letterSpacing: 0.3,
  },
  creatorSeparator: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#8B7355',
  },
  instagramContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instagramUsername: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#E1306C',
    letterSpacing: 0.3,
  },
  privacyNotice: {
    backgroundColor: 'rgba(13, 8, 5, 0.4)',
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.1)',
  },
  privacyText: {
    fontSize: 8,
    fontWeight: '400' as const,
    color: '#8B7355',
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.8,
  },
  customPriceSection: {
    marginTop: 20,
    backgroundColor: 'rgba(18, 10, 5, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
    borderLeftColor: 'rgba(255, 185, 50, 0.2)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
  },
  customPriceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  editCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 140, 0, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  editCustomButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFD700',
    letterSpacing: 0.6,
  },
  customPriceHelp: {
    fontSize: 10,
    color: '#FFB347',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic' as const,
    opacity: 0.9,
  },
  customPricesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  customPriceInputBox: {
    width: '48%',
    backgroundColor: 'rgba(30, 18, 10, 0.9)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.35)',
    borderLeftColor: 'rgba(205, 127, 50, 0.25)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.35)',
  },
  customPriceBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  customPriceLabel: {
    fontSize: 11,
    color: '#FFB347',
    fontWeight: '600' as const,
    letterSpacing: 0.6,
  },
  resetButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 4,
  },
  customPriceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 5, 0, 0.85)',
    borderRadius: 7,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.5)',
  },
  customPriceInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  resetAllButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FF6B6B',
    letterSpacing: 0.6,
  },
  activeCustomPricesContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  activeCustomPricesLabel: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600' as const,
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  activeCustomPricesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeCustomPriceItem: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  activeCustomPriceText: {
    fontSize: 10,
    color: '#FFB347',
    fontWeight: '600' as const,
  },
});
