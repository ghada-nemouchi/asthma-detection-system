// doctor-dashboard/src/components/RiskBadge.jsx
import React from 'react';

const RiskBadge = ({ riskLevel }) => {
  const config = {
    low: {
      label: 'Low Risk',
      className: 'risk-badge-low',
      icon: '🟢'
    },
    medium: {
      label: 'Medium Risk',
      className: 'risk-badge-medium',
      icon: '🟡'
    },
    high: {
      label: 'High Risk',
      className: 'risk-badge-high',
      icon: '🟠'
    },
    critical: {
      label: 'Critical!',
      className: 'risk-badge-critical',
      icon: '🔴'
    },
  };

  const { label, className, icon } = config[riskLevel] || config.low;

  return (
    <span className={`${className} inline-flex items-center gap-1`}>
      <span>{icon}</span>
      {label}
    </span>
  );
};

export default RiskBadge;