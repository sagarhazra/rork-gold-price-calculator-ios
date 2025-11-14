import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftRight, Scale, RefreshCw, Calculator, Ruler, Calendar, Instagram } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type CaratType = '9K' | '18K' | '20K' | '22K';
type MeasurementType = 'weight' | 'carat' | 'ratti';
type ScreenMode = 'home' | 'reverse' | 'converter' | 'dateCalculator';

const STORAGE_KEY = 'goldBasePrice' as const;
const CUSTOM_PRICES_KEY = 'customCaratPrices' as const;

const RATTI_TO_GRAM = 0.12125;
const CARAT_TO_GRAM = 0.2;

type CustomPrices = {
  '9K'?: string;
  '18K'?: string;
  '20K'?: string;
  '22K'?: string;
};

export default function AdvancedCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const [basePrice, setBasePrice] = useState<string>('0');
  const [customPrices, setCustomPrices] = useState<CustomPrices>({});
  const [carat9Purity, setCarat9Purity] = useState<string>('38');
  const [carat18Purity, setCarat18Purity] = useState<string>('76');
  const [carat20Purity, setCarat20Purity] = useState<string>('84');
  const [carat22Purity, setCarat22Purity] = useState<string>('92');

  const [reverseFinalPrice, setReverseFinalPrice] = useState<string>('');
  const [reverseMakingCharge, setReverseMakingCharge] = useState<string>('10');
  const [reverseGst, setReverseGst] = useState<string>('3');
  const [reverseSelectedCarat, setReverseSelectedCarat] = useState<CaratType>('22K');

  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementType>('weight');
  const [weightValue, setWeightValue] = useState<string>('');
  const [caratValue, setCaratValue] = useState<string>('');
  const [rattiValue, setRattiValue] = useState<string>('');
  const [screenMode, setScreenMode] = useState<ScreenMode>('home');

  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [includeToDate, setIncludeToDate] = useState<boolean>(false);
  const [showFromPicker, setShowFromPicker] = useState<boolean>(false);
  const [showToPicker, setShowToPicker] = useState<boolean>(false);
  const [activePickerField, setActivePickerField] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedPrice = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedPrice && typeof savedPrice === 'string') {
          const trimmed = savedPrice.trim();
          if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            const numValue = parseFloat(trimmed);
            if (!isNaN(numValue) && isFinite(numValue) && numValue >= 0) {
              setBasePrice(trimmed);
            }
          }
        }
        
        const savedCustomPrices = await AsyncStorage.getItem(CUSTOM_PRICES_KEY);
        if (savedCustomPrices && typeof savedCustomPrices === 'string') {
          const trimmed = savedCustomPrices.trim();
          if (trimmed && trimmed.length > 0) {
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  setCustomPrices(parsed as CustomPrices);
                } else {
                  console.log('Invalid custom prices format, removing...');
                  await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
                }
              } catch (parseError) {
                console.log('JSON parse error in advanced tab, removing corrupted data:', parseError);
                await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
              }
            } else {
              console.log('Non-JSON data found in custom prices storage, removing...');
              await AsyncStorage.removeItem(CUSTOM_PRICES_KEY);
            }
          }
        }
      } catch (error) {
        console.log('Error loading data in advanced tab:', error);
      }
    };

    loadData();
  }, []);

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
    if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) return defaultValue;
    return parsed;
  }, []);

  const basePriceNum = useMemo(() => sanitizeNumber(basePrice, 0), [basePrice, sanitizeNumber]);
  const purity9 = useMemo(() => sanitizeNumber(carat9Purity, 38), [carat9Purity, sanitizeNumber]);
  const purity18 = useMemo(() => sanitizeNumber(carat18Purity, 76), [carat18Purity, sanitizeNumber]);
  const purity20 = useMemo(() => sanitizeNumber(carat20Purity, 84), [carat20Purity, sanitizeNumber]);
  const purity22 = useMemo(() => sanitizeNumber(carat22Purity, 92), [carat22Purity, sanitizeNumber]);

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

  const getReverseCaratPrice = useMemo((): number => {
    switch (reverseSelectedCarat) {
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
  }, [reverseSelectedCarat, carat9Price, carat18Price, carat20Price, carat22Price]);

  const calculateWeightFromPrice = useMemo(() => {
    const finalPrice = sanitizeNumber(reverseFinalPrice, 0);
    const makingCharge = sanitizeNumber(reverseMakingCharge, 0);
    const gst = sanitizeNumber(reverseGst, 0);
    const caratPrice = getReverseCaratPrice;

    console.log('Reverse Calculation Debug:', {
      finalPrice,
      makingCharge,
      gst,
      caratPrice,
      basePriceNum,
    });

    if (finalPrice === 0 || caratPrice === 0) {
      console.log('Returning 0 because finalPrice or caratPrice is 0');
      return 0;
    }

    const totalGstMultiplier = 1 + gst / 100;
    const priceBeforeGst = finalPrice / totalGstMultiplier;

    const makingMultiplier = 1 + makingCharge / 100;
    const goldPrice = priceBeforeGst / makingMultiplier;

    const pricePerGram = caratPrice / 10;
    const weight = goldPrice / pricePerGram;

    console.log('Calculated weight:', weight);

    return isFinite(weight) && weight > 0 ? weight : 0;
  }, [reverseFinalPrice, reverseMakingCharge, reverseGst, getReverseCaratPrice, sanitizeNumber, basePriceNum]);

  const handleReverseFinalPriceChange = useCallback((text: string) => {
    setReverseFinalPrice(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleReverseMakingChargeChange = useCallback((text: string) => {
    setReverseMakingCharge(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const handleReverseGstChange = useCallback((text: string) => {
    setReverseGst(sanitizeNumericInput(text));
  }, [sanitizeNumericInput]);

  const resetReverseCalculator = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setReverseFinalPrice('');
    setReverseMakingCharge('10');
    setReverseGst('3');
  }, []);

  const handleMeasurementInputChange = useCallback((type: MeasurementType, text: string) => {
    const sanitized = sanitizeNumericInput(text);
    const value = sanitizeNumber(sanitized, 0);

    switch (type) {
      case 'weight':
        setWeightValue(sanitized);
        if (value > 0) {
          setCaratValue((value / CARAT_TO_GRAM).toFixed(4));
          setRattiValue((value / RATTI_TO_GRAM).toFixed(4));
        } else {
          setCaratValue('');
          setRattiValue('');
        }
        break;
      case 'carat':
        setCaratValue(sanitized);
        if (value > 0) {
          const weightInGrams = value * CARAT_TO_GRAM;
          setWeightValue(weightInGrams.toFixed(4));
          setRattiValue((weightInGrams / RATTI_TO_GRAM).toFixed(4));
        } else {
          setWeightValue('');
          setRattiValue('');
        }
        break;
      case 'ratti':
        setRattiValue(sanitized);
        if (value > 0) {
          const weightInGrams = value * RATTI_TO_GRAM;
          setWeightValue(weightInGrams.toFixed(4));
          setCaratValue((weightInGrams / CARAT_TO_GRAM).toFixed(4));
        } else {
          setWeightValue('');
          setCaratValue('');
        }
        break;
    }
    setSelectedMeasurement(type);
  }, [sanitizeNumericInput, sanitizeNumber]);

  const resetConverter = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setWeightValue('');
    setCaratValue('');
    setRattiValue('');
  }, []);

  const calculateDateDifference = useMemo(() => {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);
    
    if (includeToDate) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const isNegative = diffDays < 0;
    const absDiffDays = Math.abs(diffDays);
    
    const weeks = Math.floor(absDiffDays / 7) * (isNegative ? -1 : 1);
    const remainingDays = (absDiffDays % 7) * (isNegative ? -1 : 1);
    
    let years = 0;
    let months = 0;
    let days = 0;
    
    if (isNegative) {
      let tempDate = new Date(start);
      let count = 0;
      
      while (tempDate > end && count < 1000) {
        const nextYear = new Date(tempDate);
        nextYear.setFullYear(nextYear.getFullYear() - 1);
        if (nextYear <= end) {
          break;
        }
        tempDate = nextYear;
        years--;
        count++;
      }
      
      count = 0;
      while (tempDate > end && count < 100) {
        const nextMonth = new Date(tempDate);
        nextMonth.setMonth(nextMonth.getMonth() - 1);
        if (nextMonth <= end) {
          break;
        }
        tempDate = nextMonth;
        months--;
        count++;
      }
      
      days = Math.floor((end.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      let tempDate = new Date(start);
      let count = 0;
      
      while (tempDate < end && count < 1000) {
        const nextYear = new Date(tempDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        if (nextYear > end) {
          break;
        }
        tempDate = nextYear;
        years++;
        count++;
      }
      
      count = 0;
      while (tempDate < end && count < 100) {
        const nextMonth = new Date(tempDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        if (nextMonth > end) {
          break;
        }
        tempDate = nextMonth;
        months++;
        count++;
      }
      
      days = Math.floor((end.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const totalMonths = Math.abs(years * 12 + months);
    
    let daysAfterYears = absDiffDays;
    const absYears = Math.abs(years);
    for (let y = 0; y < absYears; y++) {
      const yearToCheck = isNegative ? start.getFullYear() - y : start.getFullYear() + y;
      const isLeap = (yearToCheck % 4 === 0 && yearToCheck % 100 !== 0) || (yearToCheck % 400 === 0);
      daysAfterYears -= isLeap ? 366 : 365;
    }
    daysAfterYears = Math.abs(daysAfterYears) * (isNegative ? -1 : 1);
    
    return {
      days: diffDays,
      weeks,
      weekDays: remainingDays,
      years,
      months,
      monthDays: days,
      totalMonths: isNegative ? -totalMonths : totalMonths,
      monthsRemainingDays: days,
      daysAfterYears,
    };
  }, [fromDate, toDate, includeToDate]);

  const handleFromDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setFromDate(selectedDate);
    }
  }, []);

  const handleToDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setToDate(selectedDate);
    }
  }, []);

  const closeDatePicker = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowFromPicker(false);
    setShowToPicker(false);
    setActivePickerField(null);
  }, []);

  const setToToday = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setToDate(new Date());
  }, []);

  const setFromToToday = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activePickerField === 'from') {
      setFromDate(new Date());
    } else if (activePickerField === 'to') {
      setToDate(new Date());
    }
  }, [activePickerField]);

  const resetDateCalculator = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setFromDate(new Date());
    setToDate(new Date());
    setIncludeToDate(false);
  }, []);

  const formatDate = useCallback((date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${dayName} - ${day} ${monthName} ${year} (${day}/${month}/${year})`;
  }, []);

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
        }
      }, Platform.OS === 'android' ? 400 : 150);
    }
  }, []);

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
                paddingTop: insets.top + 20,
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
            {screenMode === 'home' && (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.mainTitle} testID="advanced-title">Advanced Tools</Text>
                </View>

                <View style={styles.cardsGrid}>
                  <TouchableOpacity
                    style={styles.featureCard}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      setScreenMode('reverse');
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Reverse Calculator"
                    testID="feature-reverse-calculator"
                  >
                    <View style={styles.iconCircle}>
                      <Calculator size={20} color="#FFD700" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.featureTitle}>Reverse Calculator</Text>
                    <Text style={styles.featureDescription}>
                      Calculate weight from final price
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.featureCard}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      setScreenMode('converter');
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Unit Converter"
                    testID="feature-unit-converter"
                  >
                    <View style={styles.iconCircle}>
                      <Ruler size={20} color="#FFD700" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.featureTitle}>Unit Converter</Text>
                    <Text style={styles.featureDescription}>
                      Convert Weight, Carat & Ratti
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.featureCard}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      setScreenMode('dateCalculator');
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Date Calculator"
                    testID="feature-date-calculator"
                  >
                    <View style={styles.iconCircle}>
                      <Calendar size={20} color="#FFD700" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.featureTitle}>Date Calculator</Text>
                    <Text style={styles.featureDescription}>
                      Calculate Days Between Dates
                    </Text>
                  </TouchableOpacity>
                </View>

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
              </>
            )}

            {screenMode === 'reverse' && (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setScreenMode('home');
                  }}
                  testID="back-button-reverse"
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

            <View style={styles.sectionCard} testID="reverse-calculator-card">
              <View style={styles.sectionHeader}>
                <ArrowLeftRight size={20} color="#FFD700" />
                <Text style={styles.sectionTitle}>Reverse Calculator</Text>
              </View>
              <Text style={styles.sectionDescription}>Calculate weight from final price</Text>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Final Price</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    ref={(ref) => { inputRefs.current['reverseFinalPrice'] = ref; }}
                    style={styles.input}
                    value={reverseFinalPrice}
                    onChangeText={handleReverseFinalPriceChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#666"
                    onFocus={() => scrollToInput('reverseFinalPrice')}
                    accessible={true}
                    accessibilityLabel="Final price"
                    returnKeyType="done"
                    maxLength={10}
                    testID="reverse-final-price-input"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Making Charge (%)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={(ref) => { inputRefs.current['reverseMaking'] = ref; }}
                    style={styles.input}
                    value={reverseMakingCharge}
                    onChangeText={handleReverseMakingChargeChange}
                    keyboardType="numeric"
                    placeholderTextColor="#666"
                    onFocus={() => scrollToInput('reverseMaking')}
                    accessible={true}
                    accessibilityLabel="Making charge percentage"
                    returnKeyType="done"
                    maxLength={6}
                    testID="reverse-making-charge-input"
                  />
                  <Text style={styles.percentSymbol}>%</Text>
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>GST (%)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={(ref) => { inputRefs.current['reverseGst'] = ref; }}
                    style={styles.input}
                    value={reverseGst}
                    onChangeText={handleReverseGstChange}
                    keyboardType="numeric"
                    placeholderTextColor="#666"
                    onFocus={() => scrollToInput('reverseGst')}
                    accessible={true}
                    accessibilityLabel="GST percentage"
                    returnKeyType="done"
                    maxLength={5}
                    testID="reverse-gst-input"
                  />
                  <Text style={styles.percentSymbol}>%</Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Select Carat</Text>
              <View style={styles.caratSelector}>
                {(['9K', '18K', '20K', '22K'] as CaratType[]).map((carat) => (
                  <TouchableOpacity
                    key={carat}
                    style={[
                      styles.caratButton,
                      reverseSelectedCarat === carat && styles.caratButtonActive,
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      setReverseSelectedCarat(carat);
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${carat} gold`}
                    accessibilityState={{ selected: reverseSelectedCarat === carat }}
                    testID={`reverse-carat-${carat}`}
                  >
                    <Text
                      style={[
                        styles.caratButtonText,
                        reverseSelectedCarat === carat && styles.caratButtonTextActive,
                      ]}
                    >
                      {carat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {sanitizeNumber(reverseFinalPrice, 0) > 0 && (
                <View style={styles.resultBox} testID="reverse-result-box">
                  <Text style={styles.resultLabel}>Calculated Weight</Text>
                  <Text style={styles.resultValue}>
                    {calculateWeightFromPrice.toFixed(3)} grams
                  </Text>
                  <Text style={styles.resultSubtext}>
                    Based on {reverseSelectedCarat} @ ₹{getReverseCaratPrice} per 10g
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.resetButton} onPress={resetReverseCalculator} testID="reset-reverse-calculator">
                <RefreshCw size={16} color="#FF6B6B" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
              </>
            )}

            {screenMode === 'converter' && (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setScreenMode('home');
                  }}
                  testID="back-button-converter"
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

            <View style={styles.sectionCard} testID="unit-converter-card">
              <View style={styles.sectionHeader}>
                <Scale size={20} color="#FFD700" />
                <Text style={styles.sectionTitle}>Unit Converter</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Convert between Weight, Carat, and Ratti
              </Text>

              <View style={styles.converterInputsGrid}>
                <View style={[styles.converterInputBox, selectedMeasurement === 'weight' && styles.converterInputBoxActive]}>
                  <Text style={styles.converterLabel}>Weight (g)</Text>
                  <TextInput
                    ref={(ref) => { inputRefs.current['weight'] = ref; }}
                    style={[styles.converterInput, selectedMeasurement === 'weight' && styles.converterInputActive]}
                    value={weightValue}
                    onChangeText={(text) => handleMeasurementInputChange('weight', text)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#666"
                    onFocus={() => {
                      setSelectedMeasurement('weight');
                      scrollToInput('weight');
                    }}
                    accessible={true}
                    accessibilityLabel="Weight in grams"
                    returnKeyType="done"
                    testID="weight-input"
                  />
                  <Text style={styles.converterUnit}>grams</Text>
                </View>

                <View style={[styles.converterInputBox, selectedMeasurement === 'carat' && styles.converterInputBoxActive]}>
                  <Text style={styles.converterLabel}>Carat (ct)</Text>
                  <TextInput
                    ref={(ref) => { inputRefs.current['carat'] = ref; }}
                    style={[styles.converterInput, selectedMeasurement === 'carat' && styles.converterInputActive]}
                    value={caratValue}
                    onChangeText={(text) => handleMeasurementInputChange('carat', text)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#666"
                    onFocus={() => {
                      setSelectedMeasurement('carat');
                      scrollToInput('carat');
                    }}
                    accessible={true}
                    accessibilityLabel="Weight in carats"
                    returnKeyType="done"
                    testID="carat-input"
                  />
                  <Text style={styles.converterUnit}>carats</Text>
                </View>

                <View style={[styles.converterInputBox, selectedMeasurement === 'ratti' && styles.converterInputBoxActive]}>
                  <Text style={styles.converterLabel}>Ratti</Text>
                  <TextInput
                    ref={(ref) => { inputRefs.current['ratti'] = ref; }}
                    style={[styles.converterInput, selectedMeasurement === 'ratti' && styles.converterInputActive]}
                    value={rattiValue}
                    onChangeText={(text) => handleMeasurementInputChange('ratti', text)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#666"
                    onFocus={() => {
                      setSelectedMeasurement('ratti');
                      scrollToInput('ratti');
                    }}
                    accessible={true}
                    accessibilityLabel="Weight in ratti"
                    returnKeyType="done"
                    testID="ratti-input"
                  />
                  <Text style={styles.converterUnit}>ratti</Text>
                </View>
              </View>

              <View style={styles.conversionInfo}>
                <Text style={styles.conversionInfoText}>
                  1 Ratti = {RATTI_TO_GRAM}g • 1 Carat = {CARAT_TO_GRAM}g
                </Text>
              </View>

              <TouchableOpacity style={styles.resetButton} onPress={resetConverter} testID="reset-converter">
                <RefreshCw size={16} color="#FF6B6B" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
              </>
            )}

            {screenMode === 'dateCalculator' && (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setScreenMode('home');
                  }}
                  testID="back-button-date"
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.sectionCard} testID="date-calculator-card">
                  <View style={styles.sectionHeader}>
                    <Calendar size={20} color="#FFD700" />
                    <Text style={styles.sectionTitle}>Date Calculator</Text>
                  </View>
                  <Text style={styles.sectionDescription}>
                    Calculate days between two dates
                  </Text>

                  <View style={styles.datePickerSection}>
                    <View style={styles.datePickerRow}>
                      <Text style={styles.dateLabel}>From</Text>
                      <TouchableOpacity
                        style={[styles.dateDisplayBox, activePickerField === 'from' && styles.dateDisplayBoxActive]}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          setShowFromPicker(true);
                          setShowToPicker(false);
                          setActivePickerField('from');
                        }}
                        testID="from-date-picker"
                      >
                        <Text style={[styles.dateDisplayText, activePickerField === 'from' && styles.dateDisplayTextActive]}>{formatDate(fromDate)}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.datePickerRow}>
                      <Text style={styles.dateLabel}>To</Text>
                      <TouchableOpacity
                        style={[styles.dateDisplayBox, activePickerField === 'to' && styles.dateDisplayBoxActive]}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          setShowToPicker(true);
                          setShowFromPicker(false);
                          setActivePickerField('to');
                        }}
                        testID="to-date-picker"
                      >
                        <Text style={[styles.dateDisplayText, activePickerField === 'to' && styles.dateDisplayTextActive]}>{formatDate(toDate)}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.includeToggleRow}>
                      <Text style={styles.includeToggleLabel}>Include To Date</Text>
                      <TouchableOpacity
                        style={[styles.toggleSwitch, includeToDate && styles.toggleSwitchActive]}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }
                          setIncludeToDate(!includeToDate);
                        }}
                        accessible={true}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: includeToDate }}
                        testID="include-to-date-toggle"
                      >
                        <View style={[styles.toggleThumb, includeToDate && styles.toggleThumbActive]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.dateResultsContainer}>
                    <View style={styles.dateResultRow}>
                      <Text style={styles.dateResultLabel}>Days</Text>
                      <Text style={styles.dateResultValue} testID="result-days">{calculateDateDifference.days} Days</Text>
                    </View>

                    <View style={styles.dateResultRow}>
                      <Text style={styles.dateResultLabel}>Weeks</Text>
                      <Text style={styles.dateResultValue} testID="result-weeks">
                        {calculateDateDifference.weeks} Weeks {calculateDateDifference.weekDays} Days
                      </Text>
                    </View>

                    <View style={styles.dateResultRow}>
                      <Text style={styles.dateResultLabel}>Months</Text>
                      <Text style={styles.dateResultValue} testID="result-months">
                        {calculateDateDifference.totalMonths} Months {calculateDateDifference.monthsRemainingDays} Days
                      </Text>
                    </View>

                    <View style={styles.dateResultRow}>
                      <Text style={styles.dateResultLabel}>Years</Text>
                      <Text style={styles.dateResultValue} testID="result-years">
                        {calculateDateDifference.years} Years {calculateDateDifference.daysAfterYears} Days
                      </Text>
                    </View>

                    <View style={styles.dateResultRow}>
                      <Text style={styles.dateResultLabel}>Years & Months</Text>
                      <Text style={styles.dateResultValue} testID="result-years-months">
                        {calculateDateDifference.years} Years {calculateDateDifference.months} Months {calculateDateDifference.monthDays} Days
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dateButtonsRow}>
                    <TouchableOpacity
                      style={styles.dateActionButton}
                      onPress={setToToday}
                      testID="set-to-today-button"
                    >
                      <Text style={styles.dateActionButtonText}>Set To Today</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.resetButton} onPress={resetDateCalculator} testID="reset-date-calculator">
                    <RefreshCw size={16} color="#FF6B6B" />
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                {Platform.OS === 'android' && showFromPicker && (
                  <DateTimePicker
                    value={fromDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowFromPicker(false);
                      handleFromDateChange(event, date);
                    }}
                  />
                )}
                {Platform.OS === 'android' && showToPicker && (
                  <DateTimePicker
                    value={toDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowToPicker(false);
                      handleToDateChange(event, date);
                    }}
                  />
                )}
                {Platform.OS === 'ios' && (showFromPicker || showToPicker) && (
                  <View style={styles.pickerOverlay}>
                    <TouchableOpacity 
                      style={styles.pickerBackdrop} 
                      activeOpacity={1} 
                      onPress={closeDatePicker}
                    />
                    <View style={styles.pickerContainer} pointerEvents="auto">
                      <View style={styles.pickerHeader}>
                        <Text style={styles.pickerHeaderText}>
                          {showFromPicker ? 'Select From Date' : 'Select To Date'}
                        </Text>
                      </View>
                      {showFromPicker && (
                        <DateTimePicker
                          value={fromDate}
                          mode="date"
                          display="spinner"
                          onChange={handleFromDateChange}
                          textColor="#FFD700"
                          locale="en_GB"
                        />
                      )}
                      {showToPicker && (
                        <DateTimePicker
                          value={toDate}
                          mode="date"
                          display="spinner"
                          onChange={handleToDateChange}
                          textColor="#FFD700"
                          locale="en_GB"
                        />
                      )}
                      <View style={styles.pickerButtonsRow}>
                        <TouchableOpacity
                          style={styles.pickerTodayButton}
                          onPress={setFromToToday}
                          testID="picker-today-button"
                        >
                          <Text style={styles.pickerTodayButtonText}>Today</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pickerDoneButton}
                          onPress={closeDatePicker}
                          testID="picker-done-button"
                        >
                          <Text style={styles.pickerDoneButtonText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
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
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  backButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFD700',
    letterSpacing: 0.8,
  },
  cardsGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: 'rgba(26, 15, 10, 0.95)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    borderLeftColor: 'rgba(255, 185, 50, 0.3)',
    borderRightColor: 'rgba(205, 127, 50, 0.3)',
    borderBottomColor: 'rgba(184, 115, 51, 0.4)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#FFD700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 5,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 10,
    color: '#B8956A',
    textAlign: 'center',
    lineHeight: 14,
    fontStyle: 'italic' as const,
  },
  sectionCard: {
    backgroundColor: 'rgba(26, 15, 10, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    borderLeftColor: 'rgba(255, 185, 50, 0.3)',
    borderRightColor: 'rgba(205, 127, 50, 0.3)',
    borderBottomColor: 'rgba(184, 115, 51, 0.4)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionDescription: {
    fontSize: 12,
    color: '#B8956A',
    marginBottom: 16,
    fontStyle: 'italic' as const,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    color: '#FFB347',
    marginBottom: 8,
    fontWeight: '500' as const,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 10, 5, 0.95)',
    borderRadius: 12,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    borderLeftColor: 'rgba(255, 185, 50, 0.3)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
    paddingHorizontal: 16,
    height: 48,
  },
  currencySymbol: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600' as const,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  percentSymbol: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  caratSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  caratButton: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 8, 0.98)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderTopColor: 'rgba(139, 69, 19, 0.4)',
    borderLeftColor: 'rgba(160, 82, 45, 0.3)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
  },
  caratButtonActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.35)',
    borderWidth: 3,
    borderTopColor: '#FFD700',
    borderLeftColor: '#FF8C00',
    borderRightColor: '#CD853F',
    borderBottomColor: '#B8860B',
    transform: [{ scale: 1.05 }],
  },
  caratButtonText: {
    fontSize: 13,
    color: '#A0826D',
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  caratButtonTextActive: {
    color: '#FFD700',
    fontWeight: '800' as const,
    fontSize: 14,
  },
  resultBox: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.5)',
    borderLeftColor: 'rgba(255, 185, 50, 0.4)',
    borderRightColor: 'rgba(205, 127, 50, 0.4)',
    borderBottomColor: 'rgba(184, 115, 51, 0.5)',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    color: '#FFB347',
    marginBottom: 6,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
  },
  resultValue: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  resultSubtext: {
    fontSize: 10,
    color: '#B8956A',
    marginTop: 4,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF6B6B',
    letterSpacing: 0.6,
  },
  converterInputsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  converterInputBox: {
    backgroundColor: 'rgba(18, 10, 5, 0.95)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderTopColor: 'rgba(139, 69, 19, 0.4)',
    borderLeftColor: 'rgba(160, 82, 45, 0.3)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
  },
  converterInputBoxActive: {
    borderWidth: 3,
    borderTopColor: 'rgba(255, 215, 0, 0.6)',
    borderLeftColor: 'rgba(255, 185, 50, 0.5)',
    borderRightColor: 'rgba(205, 127, 50, 0.5)',
    borderBottomColor: 'rgba(184, 115, 51, 0.6)',
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
  },
  converterLabel: {
    fontSize: 12,
    color: '#FFB347',
    marginBottom: 8,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
  },
  converterInput: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700' as const,
    marginBottom: 4,
    textAlign: 'center',
  },
  converterInputActive: {
    color: '#FFD700',
  },
  converterUnit: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  conversionInfo: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  conversionInfoText: {
    fontSize: 10,
    color: '#B8956A',
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
  datePickerSection: {
    marginBottom: 20,
  },
  datePickerRow: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 12,
    color: '#FFB347',
    marginBottom: 8,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  dateDisplayBox: {
    backgroundColor: 'rgba(18, 10, 5, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 3,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    borderLeftColor: 'rgba(255, 185, 50, 0.3)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
  },
  dateDisplayBoxActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    borderTopColor: 'rgba(255, 215, 0, 0.8)',
    borderLeftColor: 'rgba(255, 185, 50, 0.7)',
    borderRightColor: 'rgba(205, 127, 50, 0.7)',
    borderBottomColor: 'rgba(184, 115, 51, 0.8)',
  },
  dateDisplayText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  dateDisplayTextActive: {
    color: '#FFD700',
    fontWeight: '700' as const,
  },
  includeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  includeToggleLabel: {
    fontSize: 13,
    color: '#FFB347',
    fontWeight: '600' as const,
    letterSpacing: 0.6,
  },
  toggleSwitch: {
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 69, 19, 0.5)',
    padding: 3,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(160, 82, 45, 0.4)',
  },
  toggleSwitchActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.6)',
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B7355',
  },
  toggleThumbActive: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-end',
  },
  dateResultsContainer: {
    backgroundColor: 'rgba(18, 10, 5, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    borderLeftColor: 'rgba(255, 185, 50, 0.3)',
    borderRightColor: 'rgba(139, 69, 19, 0.3)',
    borderBottomColor: 'rgba(160, 82, 45, 0.4)',
  },
  dateResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 140, 0, 0.15)',
  },
  dateResultLabel: {
    fontSize: 12,
    color: '#FFB347',
    fontWeight: '600' as const,
    letterSpacing: 0.6,
  },
  dateResultValue: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  dateButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  dateActionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 140, 0, 0.25)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.5)',
    borderLeftColor: 'rgba(255, 185, 50, 0.4)',
    borderRightColor: 'rgba(205, 127, 50, 0.4)',
    borderBottomColor: 'rgba(184, 115, 51, 0.5)',
    alignItems: 'center',
  },
  dateActionButtonText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 20,
    elevation: 999,
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  pickerContainer: {
    backgroundColor: 'rgba(26, 15, 10, 0.98)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
    borderWidth: 3,
    borderTopColor: 'rgba(255, 215, 0, 0.6)',
    borderLeftColor: 'rgba(255, 185, 50, 0.5)',
    borderRightColor: 'rgba(205, 127, 50, 0.5)',
    borderBottomColor: 'rgba(184, 115, 51, 0.6)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  pickerHeader: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: 12,
    alignItems: 'center',
  },
  pickerHeaderText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFD700',
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    justifyContent: 'space-between',
  },
  pickerTodayButton: {
    flex: 1,
    backgroundColor: 'rgba(100, 180, 255, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderTopColor: 'rgba(100, 180, 255, 0.6)',
    borderLeftColor: 'rgba(100, 180, 255, 0.5)',
    borderRightColor: 'rgba(70, 150, 225, 0.5)',
    borderBottomColor: 'rgba(70, 150, 225, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTodayButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#87CEEB',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pickerDoneButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 140, 0, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 215, 0, 0.6)',
    borderLeftColor: 'rgba(255, 185, 50, 0.5)',
    borderRightColor: 'rgba(205, 127, 50, 0.5)',
    borderBottomColor: 'rgba(184, 115, 51, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDoneButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  creatorSection: {
    backgroundColor: 'rgba(13, 8, 5, 0.6)',
    borderRadius: 10,
    padding: 10,
    paddingTop: 12,
    marginTop: 16,
    marginBottom: 8,
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
});
