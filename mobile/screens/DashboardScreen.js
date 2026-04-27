// screens/DashboardScreen.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  ActivityIndicator, Alert, Switch, StyleSheet, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import api from '../services/api';
import { getUser, getToken } from '../utils/storage';
import EnvironmentalWidget from '../components/EnvironmentalWidget';
import { initializeSocket, disconnectSocket, getSocket } from '../services/socket';

import AsyncStorage from '@react-native-async-storage/async-storage';
// ─── inline RiskCard ───────────────────────────────────────────────────────
function RiskCard({ riskScore, riskLevel }) {
  if (!riskLevel || riskLevel === 'none') {
    return (
      <View style={[styles.riskCard, { backgroundColor: '#e5e7eb' }]}>
        <Text style={styles.riskLabel}>Risk Level</Text>
        <Text style={[styles.riskValue, { color: '#6b7280' }]}>No Reading Yet</Text>
        <Text style={styles.riskSub}>Submit your first reading below</Text>
      </View>
    );
  }
  const cfg = {
    low:      { bg: ['#10b981', '#059669'], label: 'Low',      emoji: '✅' },
    medium:   { bg: ['#f59e0b', '#d97706'], label: 'Medium',   emoji: '⚠️' },
    high:     { bg: ['#f97316', '#ea580c'], label: 'High',     emoji: '🔶' },
    critical: { bg: ['#ef4444', '#dc2626'], label: 'Critical', emoji: '🚨' },
  }[riskLevel] || { bg: ['#10b981', '#059669'], label: 'Low', emoji: '✅' };

  return (
    <LinearGradient colors={cfg.bg} style={styles.riskCard}>
      <Text style={styles.riskLabel}>Risk Level</Text>
      <Text style={styles.riskValue}>{cfg.emoji} {cfg.label}</Text>
      <Text style={styles.riskSub}>
        AI Score: {Math.round((riskScore || 0) * 100)}%
      </Text>
    </LinearGradient>
  );
}

// ─── inline Slider component ──────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, onChange, unit = '' }) {
  const steps = Math.round((max - min) / step);
  const idx   = Math.round((value - min) / step);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderVal}>{value}{unit}</Text>
      </View>
      <View style={styles.sliderTrack}>
        {Array.from({ length: steps + 1 }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onChange(min + i * step)}
            style={[styles.sliderDot, i === idx && styles.sliderDotActive]}
          />
        ))}
        <View style={[styles.sliderFill, { width: `${(idx / steps) * 100}%` }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.sliderMinMax}>{min}{unit}</Text>
        <Text style={styles.sliderMinMax}>{max}{unit}</Text>
      </View>
    </View>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const socketRef = useRef(null);
  const [user, setUser]         = useState(null);
  const [riskData, setRiskData] = useState({ riskScore: 0, riskLevel: 'none' });
  const [pefData, setPefData]   = useState({ value: '--', change: null });
  const [heartRate, setHeartRate] = useState(null);
  const [aqi, setAqi]           = useState(null);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasReadings, setHasReadings] = useState(false);
  const [location, setLocation] = useState(null);

  // Symptoms state — updated when returning from SymptomsLog
  const [symptoms, setSymptoms] = useState({
    coughing:          false,
    wheezing:          false,
    shortnessOfBreath: false,
    chestTightness:    false,
  });
  const [symptomSeverity, setSymptomSeverity] = useState(null);

  // Medication state — real inline controls, no alert-only
  const [rescuePuffsToday, setRescuePuffsToday] = useState(0);
  const [controllerTaken, setControllerTaken]   = useState(false);
  const [rescueStock, setRescueStock]           = useState(75);
  const [lastRescueTime, setLastRescueTime]     = useState(null);

  // Manual entry fields (only these will be shown)
  const [simNight, setSimNight] = useState(0);
  const [simDay, setSimDay] = useState(0);
  const [simHr, setSimHr] = useState(72);
  const [simSteps, setSimSteps] = useState(5000);
  const [hasCold, setHasCold] = useState(false);
  
  // PEF and Relief use (still needed for model)
  const [simPef, setSimPef] = useState(420);
  const [simReliefUse, setSimReliefUse] = useState(0);
  
  // Personal best for PEF percentage calculation
  const [personalBestPef, setPersonalBestPef] = useState(450);

  // Calculate symptom score (0-3 scale combining night + day)
  const calculateSymptomScore = () => {
    // Night symptoms (0-3 scale from slider 0-7 nights)
    let nightScore = 0;
    if (simNight >= 5) nightScore = 3;
    else if (simNight >= 3) nightScore = 2;
    else if (simNight >= 1) nightScore = 1;
    else nightScore = 0;
    
    // Day symptoms (0-3 scale from slider 0-7 days)
    let dayScore = 0;
    if (simDay >= 5) dayScore = 3;
    else if (simDay >= 3) dayScore = 2;
    else if (simDay >= 1) dayScore = 1;
    else dayScore = 0;
    
    // Combined score (0-3 scale, max 3)
    return Math.min(3, nightScore + dayScore);
  };

  // Calculate PEF percentage of personal best
  const calculatePefPercentage = () => {
    if (!personalBestPef || personalBestPef === 0) return 100;
    return Math.round((simPef / personalBestPef) * 100);
  };

  // Calculate heart rate percentage of baseline (assuming baseline 72 BPM)
  const calculateHrPercentage = () => {
    const baselineHr = 72;
    return Math.round((simHr / baselineHr) * 100);
  };

  // Calculate steps percentage of baseline (assuming baseline 5000 steps)
  const calculateStepsPercentage = () => {
    const baselineSteps = 5000;
    return Math.round((simSteps / baselineSteps) * 100);
  };

// ── Socket Connection ──
useEffect(() => {
  console.log('🔄 Dashboard mounted/updated');
  console.log('💊 Rescue Puffs Today:', rescuePuffsToday);
  console.log('💊 Controller Taken:', controllerTaken);
  console.log('💊 Rescue Stock:', rescueStock);
  const initSocket = async () => {
    try {
      const token = await getToken();
      const userData = await getUser();

      console.log('🔌 Initializing socket in Dashboard...');
      console.log('Token exists:', !!token);

      if (token && userData) {
        console.log('User role:', userData.role);

        if (userData.role === 'patient') {
          const newSocket = await initializeSocket();
          
          if (newSocket) {
            socketRef.current = newSocket;
            
            newSocket.on('doctor_request', (data) => {
              console.log('📨 Doctor request received:', data);
              Alert.alert(
                'Doctor Request',
                `Dr. ${data.doctorName} (${data.doctorSpecialty}) wants to be your doctor`,
                [
                  { text: 'Later', style: 'cancel' },
                  { text: 'View', onPress: () => navigation.navigate('DoctorRequest') },
                ]
              );
            });
            
            console.log('✅ Socket initialized successfully');
          } else {
            console.log('⚠️ Failed to initialize socket');
          }
        }
      }
    } catch (error) {
      console.error('Socket init error:', error);
    }
  };

  initSocket();

  return () => {
    disconnectSocket();
    console.log('🔌 Socket disconnected on unmount');
  };
}, []);


// Save medication state whenever it changes
useEffect(() => {
  const saveMedicationState = async () => {
    try {
      await AsyncStorage.setItem('rescuePuffsToday', rescuePuffsToday.toString());
      await AsyncStorage.setItem('controllerTaken', controllerTaken.toString());
      await AsyncStorage.setItem('rescueStock', rescueStock.toString());
      if (lastRescueTime) {
        await AsyncStorage.setItem('lastRescueTime', lastRescueTime);
      }
      console.log('💾 Saved medication state:', { rescuePuffsToday, controllerTaken, rescueStock });
    } catch (e) {
      console.error('Failed to save medication state', e);
    }
  };
  saveMedicationState();
}, [rescuePuffsToday, controllerTaken, rescueStock, lastRescueTime]);

// Load medication state on component mount
// Modify your loadMedicationState useEffect:

  // ── Location Permission using Expo Location ──────────────────────────────────
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getCurrentPosition = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
    } catch (error) {
      throw error;
    }
  };

  // ── data loading ──────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const userData = await getUser();
      setUser(userData);
      
      // Load personal best PEF from user profile
      if (userData?.personalBestPef) {
        setPersonalBestPef(userData.personalBestPef);
      }

      // Fetch readings
      const response = await api.get('/patients/me');
      console.log('📊 PROFILE API RESPONSE:', JSON.stringify(response.data, null, 2));
      if (response.data?.length > 0) {
        const latest = response.data[0];
        setHasReadings(true);
        setRiskData({
          riskScore: latest.riskScore || 0,
          riskLevel: latest.riskLevel || 'low',
        });
        if (latest.pef_norm) {
          const pefValue = Math.round(latest.pef_norm * (userData?.personalBestPef || 450));
          setPefData({
            value: pefValue,
            change: null,
          });
          setSimPef(pefValue);
        }
        if (latest.mean_hr) setHeartRate(latest.mean_hr);
        if (latest.aqi) setAqi(latest.aqi);
      } else {
        setHasReadings(false);
        setRiskData({ riskScore: 0, riskLevel: 'none' });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // ── Fetch Environmental Data with Location ────────────────────────────────
  const fetchEnvironmentalData = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        try {
          const position = await getCurrentPosition();
          setLocation(position);
          console.log('📍 Location obtained:', position);
        } catch (locationError) {
          console.error('Location error:', locationError);
          setLocation(null);
        }
      } else {
        console.log('Location permission denied');
        setLocation(null);
      }
    } catch (error) {
      console.error('Error fetching environmental data:', error);
      setLocation(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEnvironmentalData();
    }, [])
  );

  // Receive params from SymptomsLog navigation
  // Receive params from SymptomsLog navigation
    useFocusEffect(
    useCallback(() => {
      if (navigation?.getState) {
        const state = navigation.getState();
        const route = state?.routes?.[state.index];
        const params = route?.params;

        console.log('📥 Received params in Dashboard:', params);
        
        // ✅ UPDATE MEDICATION STATE FIRST (always, even without updatedSymptoms)
        if (params?.rescuePuffsToday !== undefined) {
          console.log('🔄 Updating rescuePuffsToday from params:', params.rescuePuffsToday);
          setRescuePuffsToday(params.rescuePuffsToday);
        }
        if (params?.controllerTaken !== undefined) {
          console.log('🔄 Updating controllerTaken from params:', params.controllerTaken);
          setControllerTaken(params.controllerTaken);
        }
        if (params?.rescueStock !== undefined) {
          console.log('🔄 Updating rescueStock from params:', params.rescueStock);
          setRescueStock(params.rescueStock);
        }
        
        if (params?.updatedSymptoms) {
          setSymptoms(params.updatedSymptoms);
          if (params.severity !== undefined) setSymptomSeverity(params.severity);
          
          // Update health data
          if (params.nightSymptoms !== undefined) setSimNight(params.nightSymptoms);
          if (params.daySymptoms !== undefined) setSimDay(params.daySymptoms);
          if (params.heartRate !== undefined) setSimHr(params.heartRate);
          if (params.steps !== undefined) setSimSteps(params.steps);
          if (params.hasCold !== undefined) setHasCold(params.hasCold);
          if (params.pefData?.value) setSimPef(params.pefData.value);
          if (params.reliefUse !== undefined) setSimReliefUse(params.reliefUse);
          
          navigation.setParams({ 
            updatedSymptoms: null, 
            severity: null,
            nightSymptoms: null,
            daySymptoms: null,
            heartRate: null,
            steps: null,
            hasCold: null,
            pefData: null,
            reliefUse: null,
          });
        }
      }
    }, [navigation])
  );
  // ── submit reading ────────────────────────────────────────────────────────
  const submitReading = async () => {
    setLoading(true);
    try {
      const pefPercentage = calculatePefPercentage();
      const symptomScore = calculateSymptomScore();
      const hrPercentage = calculateHrPercentage();
      const stepsPercentage = calculateStepsPercentage();
      
      const readingData = {
        night_symptoms: simNight,
        day_symptoms: simDay,
        pef: simPef,
        pef_pct_pb: pefPercentage,
        relief_use: simReliefUse,
        rescue_used: simReliefUse > 0 ? 1 : 0,
        symptom_score: symptomScore,
        steps: simSteps,
        steps_pct_bl: stepsPercentage,
        mean_hr: simHr,
        hr_pct_bl: hrPercentage,
        temperature: 22,
        aqi: aqi || 50,
        hasCold: hasCold,
        location: location || null
      };
      
      console.log('📊 Submitting reading with features:', readingData);
      
      const response = await api.post('/readings', readingData);

      const { riskScore, riskLevel } = response.data;
      setRiskData({ riskScore, riskLevel });
      setHasReadings(true);
      setPefData({ value: simPef, change: null });
      setHeartRate(simHr);

      const msg = {
        critical: ['🚨 URGENT', 'Critical risk! Take rescue inhaler immediately.'],
        high: ['⚠️ Warning', 'High risk detected. Monitor symptoms closely.'],
        medium: ['🔶 Caution', 'Medium risk. Stay alert and rest if needed.'],
        low: ['✅ All Good', 'Reading submitted. Risk is low.'],
      }[riskLevel] || ['✅ Submitted', 'Reading saved.'];
      Alert.alert(msg[0], msg[1]);
    } catch (error) {
      console.error('Submit reading error:', error);
      Alert.alert('Error', 'Failed to submit reading. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── medication helpers ────────────────────────────────────────────────────
  const logRescuePuff = () => {
    setRescuePuffsToday(n => n + 1);
    setRescueStock(s => Math.max(s - 2, 0));
    setLastRescueTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setSimReliefUse(n => Math.min(n + 1, 7));
  };

  const undoLastPuff = () => {
    if (rescuePuffsToday === 0) return;
    setRescuePuffsToday(n => n - 1);
    setRescueStock(s => Math.min(s + 2, 100));
    setSimReliefUse(n => Math.max(n - 1, 0));
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const activeSymptoms = Object.entries(symptoms)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim());

  const aqiLabel = (v) => {
    if (!v) return '—';
    if (v <= 50) return 'Good';
    if (v <= 100) return 'Moderate';
    if (v <= 150) return 'Unhealthy';
    return 'Very Unhealthy';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEnvironmentalData(); 
    setRefreshing(false);
  };

  const checkPendingRequest = async () => {
    try {
      const response = await api.get('/patients/pending-request');
      console.log('Pending request response:', response.data);
      
      if (response.data.hasPendingRequest) {
        Alert.alert(
          'Doctor Request',
          `Dr. ${response.data.doctor.name} wants to be your doctor`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Accept', onPress: () => navigation.navigate('DoctorRequest') }
          ]
        );
      } else {
        Alert.alert('No Requests', 'No pending doctor requests');
      }
    } catch (error) {
      console.error('Error checking requests:', error);
      Alert.alert('Error', 'Could not check for requests');
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Risk Card ── */}
      <RiskCard riskScore={riskData.riskScore} riskLevel={riskData.riskLevel} />

      {/* ── Check Doctor Requests Button ── */}
      <TouchableOpacity 
        style={styles.checkRequestBtn}
        onPress={checkPendingRequest}
      >
        <Text style={styles.checkRequestBtnText}>📋 Check Doctor Requests</Text>
      </TouchableOpacity>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💨</Text>
          <Text style={styles.statLabel}>Peak Flow</Text>
          <Text style={styles.statValue}>
            {pefData.value !== '--' ? `${pefData.value}` : '—'}
          </Text>
          <Text style={styles.statUnit}>L/min</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🌬️</Text>
          <Text style={styles.statLabel}>Air Quality</Text>
          <Text style={styles.statValue}>{aqiLabel(aqi)}</Text>
          <Text style={styles.statUnit}>AQI {aqi ?? '—'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>❤️</Text>
          <Text style={styles.statLabel}>Heart Rate</Text>
          <Text style={styles.statValue}>{heartRate ?? '—'}</Text>
          <Text style={styles.statUnit}>BPM</Text>
        </View>
      </View>

      {/* ── Symptom Score Display ── */}
      <View style={styles.symptomScoreCard}>
        <Text style={styles.symptomScoreLabel}>📊 Combined Symptom Score</Text>
        <Text style={styles.symptomScoreValue}>
          {calculateSymptomScore()} / 3
        </Text>
        <Text style={styles.symptomScoreSub}>
          From night + day symptoms (0=none → 3=severe)
        </Text>
      </View>

      {/* ── Manual Entry Fields ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Today's Health Data</Text>
        <Text style={styles.cardSub}>Enter your symptoms and vitals</Text>

        <Slider 
          label="Night Symptoms" 
          value={simNight} 
          min={0} 
          max={7} 
          step={1} 
          onChange={setSimNight} 
          unit=" nights" 
        />
        <Slider 
          label="Day Symptoms" 
          value={simDay} 
          min={0} 
          max={7} 
          step={1} 
          onChange={setSimDay} 
          unit=" days" 
        />
        <Slider 
          label="Heart Rate" 
          value={simHr} 
          min={50} 
          max={150} 
          step={1} 
          onChange={setSimHr} 
          unit=" BPM" 
        />
        <Slider 
          label="Steps Today" 
          value={simSteps} 
          min={0} 
          max={15000} 
          step={500} 
          onChange={setSimSteps} 
          unit=" steps" 
        />

        <View style={styles.coldRow}>
          <Text style={styles.sliderLabel}>🤧 Cold / Infection symptoms?</Text>
          <Switch
            value={hasCold}
            onValueChange={setHasCold}
            trackColor={{ true: '#ef4444', false: '#d1d5db' }}
            thumbColor={hasCold ? '#fff' : '#f4f4f4'}
          />
        </View>
      </View>

      {/* ── Environmental Widget ── */}
      <EnvironmentalWidget location={location} />

      {/* ── Today's Symptoms (specific symptoms) ── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>📋 Specific Symptoms</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('SymptomsLog', {
              currentSymptoms: symptoms,
              currentSeverity: symptomSeverity,
              currentNightSymptoms: simNight,
              currentDaySymptoms: simDay,
              currentHeartRate: simHr,
              currentSteps: simSteps,
              currentHasCold: hasCold,
              currentPef: simPef,
              currentReliefUse: simReliefUse,
              currentRescuePuffsToday: rescuePuffsToday,
              currentControllerTaken: controllerTaken,
              currentRescueStock: rescueStock
            })}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {activeSymptoms.length === 0 ? (
          <Text style={styles.noSymptomText}>No specific symptoms logged — tap Edit to log</Text>
        ) : (
          <>
            <View style={styles.symptomChips}>
              {activeSymptoms.map(s => (
                <View key={s} style={styles.symptomChip}>
                  <Text style={styles.symptomChipText}>{s}</Text>
                </View>
              ))}
            </View>
            {symptomSeverity && (
              <Text style={styles.severityText}>
                Severity: {'⬤'.repeat(symptomSeverity)}{'○'.repeat(5 - symptomSeverity)}  {symptomSeverity}/5
              </Text>
            )}
          </>
        )}
      </View>

      {/* ── Medication ── */}
      {/* ── Medication ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💊 Medication</Text>

        {/* Rescue inhaler block */}
        <View style={styles.medBlock}>
          <View style={styles.medBlockHeader}>
            <Text style={styles.medName}>🔵 Rescue Inhaler</Text>
            <View style={[styles.stockBadge, { backgroundColor: (rescueStock ?? 75) < 20 ? '#fee2e2' : '#dcfce7' }]}>
              <Text style={[styles.stockBadgeText, { color: (rescueStock ?? 75) < 20 ? '#dc2626' : '#16a34a' }]}>
                {rescueStock ?? 75}% stock
              </Text>
            </View>
          </View>

          <Text style={styles.medInfo}>
            Used today: <Text style={styles.medHighlight}>{(rescuePuffsToday ?? 0)} puff{(rescuePuffsToday ?? 0) !== 1 ? 's' : ''}</Text>
            {lastRescueTime ? `  •  Last at ${lastRescueTime}` : ''}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${rescueStock ?? 75}%`,
              backgroundColor: (rescueStock ?? 75) < 20 ? '#ef4444' : '#3b82f6',
            }]} />
          </View>

          {(rescuePuffsToday ?? 0) >= 4 && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>⚠️ High rescue use today — consider contacting your doctor</Text>
            </View>
          )}

          <View style={styles.medBtnRow}>
            <TouchableOpacity style={styles.medPrimBtn} onPress={logRescuePuff}>
              <Text style={styles.medPrimBtnText}>+ Log Puff</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.medSecBtn, (rescuePuffsToday ?? 0) === 0 && styles.medSecBtnDisabled]}
              onPress={undoLastPuff}
              disabled={(rescuePuffsToday ?? 0) === 0}
            >
              <Text style={[styles.medSecBtnText, (rescuePuffsToday ?? 0) === 0 && { color: '#9ca3af' }]}>
                Undo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
          
        {/* Daily controller block */}
        <View style={[styles.medBlock, { marginBottom: 0 }]}>
          <View style={styles.medBlockHeader}>
            <Text style={styles.medName}>🟢 Daily Controller</Text>
            <View style={[styles.stockBadge, { backgroundColor: (controllerTaken ?? false) ? '#dcfce7' : '#fef9c3' }]}>
              <Text style={[styles.stockBadgeText, { color: (controllerTaken ?? false) ? '#16a34a' : '#ca8a04' }]}>
                {(controllerTaken ?? false) ? '✓ Taken' : 'Pending'}
              </Text>
            </View>
          </View>
          <Text style={styles.medInfo}>Next scheduled dose: 8:00 AM</Text>

          {(controllerTaken ?? false) ? (
            <View style={styles.takenRow}>
              <Text style={styles.takenText}>✅ Taken today</Text>
              <TouchableOpacity onPress={() => setControllerTaken(false)}>
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.medPrimBtn}
              onPress={() => setControllerTaken(true)}
            >
              <Text style={styles.medPrimBtnText}>Mark as Taken</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Submit Reading ── */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={submitReading}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="large" />
          : <>
              <Text style={styles.submitBtnText}>🔍 Analyse & Submit Reading</Text>
              <Text style={styles.submitBtnSub}>Uses AI to calculate your risk level</Text>
            </>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, paddingBottom: 50 , paddingTop: 50 },

  riskCard: { borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center' },
  riskLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  riskValue: { fontSize: 42, fontWeight: '900', color: '#fff' },
  riskSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  checkRequestBtn: { 
    backgroundColor: '#8b5cf6', 
    borderRadius: 18, 
    padding: 16, 
    alignItems: 'center', 
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  checkRequestBtnText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', elevation: 2 },
  statIcon: { fontSize: 20, marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statUnit: { fontSize: 10, color: '#9ca3af' },

  symptomScoreCard: {
    backgroundColor: '#547bfb',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
  },
  symptomScoreLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
  },
  symptomScoreValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  symptomScoreSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  sliderLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  sliderVal: { fontSize: 13, fontWeight: '700', color: '#547bfb' },
  sliderTrack: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginVertical: 6, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  sliderFill: { position: 'absolute', left: 0, height: 6, backgroundColor: '#547bfb', borderRadius: 3 },
  sliderDot: { width: 6, height: 6, borderRadius: 3, flex: 1, zIndex: 1 },
  sliderDotActive: { backgroundColor: '#547bfb', width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff', shadowColor: '#547bfb', shadowOpacity: 0.4, shadowRadius: 4, elevation: 4, marginHorizontal: -5 },
  sliderMinMax: { fontSize: 10, color: '#9ca3af' },
  coldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },

  editBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  editBtnText: { color: '#547bfb', fontSize: 13, fontWeight: '600' },

  noSymptomText: { color: '#9ca3af', fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  symptomChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  symptomChip: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  symptomChipText: { color: '#2563eb', fontSize: 13, fontWeight: '500' },
  severityText: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  medBlock: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, marginBottom: 12 },
  medBlockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  medName: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  stockBadgeText: { fontSize: 12, fontWeight: '600' },
  medInfo: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  medHighlight: { fontWeight: '700', color: '#1f2937' },
  progressTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  warningBanner: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, marginBottom: 10 },
  warningText: { color: '#92400e', fontSize: 12, fontWeight: '500' },
  medBtnRow: { flexDirection: 'row', gap: 10 },
  medPrimBtn: { flex: 1, backgroundColor: '#547bfb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  medPrimBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  medSecBtn: { paddingHorizontal: 20, borderRadius: 12, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  medSecBtnDisabled: { opacity: 0.5 },
  medSecBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  takenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  takenText: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  undoText: { color: '#9ca3af', fontSize: 13 },

  submitBtn: { backgroundColor: '#547bfb', borderRadius: 18, padding: 20, alignItems: 'center', marginTop: 4, elevation: 4, shadowColor: '#547bfb', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  submitBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 3 },
});