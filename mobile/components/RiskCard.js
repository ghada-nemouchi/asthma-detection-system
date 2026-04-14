import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const RiskCard = ({ riskScore, riskLevel }) => {
  const getRiskColor = () => {
    switch(riskLevel?.toLowerCase()) {
      case 'critical': return ['#dc2626', '#b91c1c'];
      case 'high': return ['#f97316', '#ea580c'];
      case 'medium': return ['#eab308', '#ca8a04'];
      default: return ['#10b981', '#059669'];
    }
  };

  const getRiskLabel = () => {
    switch(riskLevel?.toLowerCase()) {
      case 'critical': return 'CRITICAL RISK';
      case 'high': return 'HIGH RISK';
      case 'medium': return 'MEDIUM RISK';
      default: return 'LOW RISK';
    }
  };

  return (
    <LinearGradient colors={getRiskColor()} style={{ borderRadius: 20, padding: 24, marginBottom: 20 }}>
      <Text style={{ color: 'white', fontSize: 14, opacity: 0.9 }}>Current Asthma Risk</Text>
      <Text style={{ color: 'white', fontSize: 56, fontWeight: 'bold', marginVertical: 8 }}>
        {Math.round((riskScore || 0) * 100)}%
      </Text>
      <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>{getRiskLabel()}</Text>
      <Text style={{ color: 'white', fontSize: 12, marginTop: 12, opacity: 0.8 }}>
        Last updated: just now
      </Text>
    </LinearGradient>
  );
};

export default RiskCard;