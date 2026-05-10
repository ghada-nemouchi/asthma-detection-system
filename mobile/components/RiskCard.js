import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const RiskCard = ({ riskScore, riskLevel, aiConfidence }) => {
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
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      default: return 'Low';
    }
  };

  return (
    <LinearGradient colors={getRiskColor()} style={{ borderRadius: 20, padding: 20, marginBottom: 20 }}>
      <Text style={{ color: 'white', fontSize: 14, opacity: 0.9 }}>Risk Level</Text>
      <Text style={{ color: 'white', fontSize: 48, fontWeight: 'bold', marginVertical: 5 }}>
        {getRiskLabel()}
      </Text>
      <Text style={{ color: 'white', fontSize: 14 }}>AI Confidence: {aiConfidence || Math.round((riskScore || 0) * 100)}%</Text>
      <View style={{ marginTop: 10 }}>
        <Text style={{ color: 'white', fontSize: 12, opacity: 0.7 }}>Peak Flow: -- L/min</Text>
      </View>
    </LinearGradient>
  );
};

export default RiskCard;