// components/EnvironmentalWidget.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../services/api';

const ITEMS = [
  { key: 'temperature', icon: '🌡️', label: 'Temp', format: v => `${Math.round(v)}°C` },
  { key: 'humidity', icon: '💧', label: 'Humidity', format: v => `${Math.round(v)}%` },
  { key: 'pollenCount', icon: '🌸', label: 'Pollen', format: v => v },
  { key: 'pollution', icon: '🏭', label: 'AQI', format: v => v },
];

// AQI Color mapping for 1-5 scale (1=Good, 5=Very Poor)
const aqiColor = (v) => {
  if (!v || isNaN(v)) return '#6b7280';
  if (v === 1) return '#10b981';  // Good - Green
  if (v === 2) return '#84cc16';  // Fair - Light Green
  if (v === 3) return '#f59e0b';  // Moderate - Yellow/Orange
  if (v === 4) return '#f97316';  // Poor - Orange
  if (v === 5) return '#ef4444';  // Very Poor - Red
  return '#6b7280';
};

const pollenColor = (v) => {
  if (!v) return '#6b7280';
  const l = String(v).toLowerCase();
  if (l === 'low') return '#10b981';
  if (l === 'medium') return '#f59e0b';
  if (l === 'high') return '#ef4444';
  return '#6b7280';
};

export default function EnvironmentalWidget({ location }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [weatherCondition, setWeatherCondition] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      // Build query params with location if available
      const params = {};
      if (location && location.lat && location.lon) {
        params.lat = location.lat;
        params.lon = location.lon;
        console.log(`📍 Fetching environmental data for location: ${location.lat}, ${location.lon}`);
      } else {
        console.log('📍 No location provided, using default (NYC)');
      }
      
      // CORRECTED: Use the environmental endpoint
      const response = await api.get('/environmental/current', { params });
      
      console.log('✅ Environmental data fetched:', response.data);
      
      // Map the backend response to our component's data structure
      setData({
        temperature: response.data.temperature,
        humidity: response.data.humidity,
        pollenCount: response.data.pollenCount || 'Low',
        pollution: response.data.pollution, // This is AQI value (1-5)
      });
      
      // Set location name from response
      if (response.data.locationName) {
        const locationString = response.data.country 
          ? `${response.data.locationName}, ${response.data.country}`
          : response.data.locationName;
        setLocationName(locationString);
      }
      
      // Store weather condition for additional info
      if (response.data.weatherCondition) {
        setWeatherCondition(response.data.weatherCondition);
      }
      
      setIsLive(true);
    } catch (err) {
      console.error('❌ Environmental API error:', err);
      setError(true);
      // Use mock data when API fails
      setData({
        temperature: 18 + Math.round(Math.random() * 10),
        humidity: 45 + Math.round(Math.random() * 35),
        pollenCount: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        pollution: 1 + Math.floor(Math.random() * 5), // Random AQI 1-5
      });
      setIsLive(false);
      setLocationName('Demo Location');
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    fetchData();
  }, [location]); // Refetch when location changes

  const getAQILevel = (aqi) => {
    if (!aqi) return 'Unknown';
    const aqiMap = {
      1: 'Good',
      2: 'Fair',
      3: 'Moderate',
      4: 'Poor',
      5: 'Very Poor'
    };
    return aqiMap[aqi] || 'Unknown';
  };

  const getAQIDescription = (aqi) => {
    if (!aqi) return '';
    const descriptions = {
      1: 'Air quality is satisfactory, air pollution poses little or no risk.',
      2: 'Air quality is acceptable, but some pollutants may concern sensitive groups.',
      3: 'Sensitive groups should reduce outdoor activities.',
      4: 'Everyone may begin to experience health effects.',
      5: 'Health alert: everyone may experience more serious health effects.'
    };
    return descriptions[aqi] || '';
  };

  const getHealthRecommendation = (aqi, pollen) => {
    if (!isLive) {
      return '📱 Using demo data. Connect to API for personalized recommendations.';
    }
    
    let recommendation = '';
    
    // AQI recommendations (based on 1-5 scale)
    if (aqi >= 4) {
      recommendation += '⚠️ Poor air quality. Avoid outdoor activities. ';
    } else if (aqi === 3) {
      recommendation += '⚠️ Moderate air quality. Sensitive groups should limit outdoor time. ';
    } else if (aqi <= 2) {
      recommendation += '✅ Good air quality. ';
    }
    
    // Pollen recommendations
    if (pollen === 'High') {
      recommendation += '🌸 High pollen levels. Keep windows closed and take allergy medication if needed. ';
    } else if (pollen === 'Medium') {
      recommendation += '🌸 Moderate pollen levels. Consider limiting time outdoors. ';
    }
    
    // Weather condition recommendations
    if (weatherCondition && weatherCondition.toLowerCase().includes('rain')) {
      recommendation += '☔ Rain expected. Have an umbrella ready. ';
    }
    
    return recommendation || '✅ Current conditions are favorable for outdoor activities.';
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#547bfb" style={{ marginVertical: 16 }} />
        <Text style={styles.loadingText}>Loading environmental data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>🌍 Environmental Factors</Text>
        <View style={[styles.badge, { backgroundColor: isLive ? '#dcfce7' : '#fef3c7' }]}>
          <Text style={[styles.badgeText, { color: isLive ? '#16a34a' : '#92400e' }]}>
            {isLive ? '🟢 Live' : '🟡 Demo'}
          </Text>
        </View>
      </View>

      {/* Location info */}
      {locationName && (
        <Text style={styles.locationText}>📍 {locationName}</Text>
      )}

      {/* Weather condition */}
      {weatherCondition && isLive && (
        <Text style={styles.weatherCondition}>☁️ {weatherCondition}</Text>
      )}

      {/* Data grid */}
      <View style={styles.grid}>
        {ITEMS.map(({ key, icon, label, format }) => {
          const val = data?.[key];
          const colorFn = key === 'pollution' ? aqiColor
            : key === 'pollenCount' ? pollenColor
              : null;
          return (
            <View key={key} style={styles.item}>
              <Text style={styles.icon}>{icon}</Text>
              <Text style={styles.label}>{label}</Text>
              <Text style={[styles.value, colorFn ? { color: colorFn(val) } : null]}>
                {val != null ? format(val) : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* AQI Level & Description */}
      {data?.pollution && (
        <View style={styles.aqiInfo}>
          <Text style={styles.aqiLevel}>
            AQI Level: {getAQILevel(data.pollution)}
          </Text>
          {isLive && (
            <Text style={styles.aqiDescription}>
              {getAQIDescription(data.pollution)}
            </Text>
          )}
        </View>
      )}

      {/* Health Recommendation */}
      {!loading && (
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationText}>
            {getHealthRecommendation(data?.pollution, data?.pollenCount)}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isLive
            ? `Live data · Updated ${lastUpdated}`
            : `Demo data · ${error ? 'API not available' : 'Tap refresh for new values'}`}
        </Text>
        <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  weatherCondition: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 3,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  aqiInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  aqiLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#547bfb',
  },
  aqiDescription: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  recommendationBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  recommendationText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    marginTop: 12,
  },
  footerText: {
    fontSize: 10,
    color: '#9ca3af',
    flex: 1,
  },
  refreshBtn: {
    padding: 4,
  },
  refreshText: {
    fontSize: 18,
    color: '#547bfb',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
});