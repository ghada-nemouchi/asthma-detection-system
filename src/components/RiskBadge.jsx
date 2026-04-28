// // doctor-dashboard/src/components/RiskBadge.jsx
// import React from 'react';

// const RiskBadge = ({ riskLevel }) => {
//   const config = {
//     low: {
//       label: 'Low Risk',
//       className: 'risk-badge-low',
//       icon: '🟢'
//     },
//     medium: {
//       label: 'Medium Risk',
//       className: 'risk-badge-medium',
//       icon: '🟡'
//     },
//     high: {
//       label: 'High Risk',
//       className: 'risk-badge-high',
//       icon: '🟠'
//     },
//     critical: {
//       label: 'Critical!',
//       className: 'risk-badge-critical',
//       icon: '🔴'
//     },
//   };

//   const { label, className, icon } = config[riskLevel] || config.low;

//   return (
//     <span className={`${className} inline-flex items-center gap-1`}>
//       <span>{icon}</span>
//       {label}
//     </span>
//   );
// };

// export default RiskBadge;
// doctor-dashboard/src/components/RiskBadge.jsx
import React from 'react';

const RiskBadge = ({ riskLevel }) => {
  // Normalize to lowercase for consistent matching
  const level = riskLevel?.toLowerCase();
  
  const config = {
    low: {
      label: 'LOW',
      className: 'bg-green-100 text-green-700',
      icon: '🟢'
    },
    medium: {
      label: 'MEDIUM',
      className: 'bg-yellow-100 text-yellow-700',
      icon: '🟡'
    },
    high: {
      label: 'HIGH',
      className: 'bg-orange-100 text-orange-700',
      icon: '🟠'
    },
    critical: {
      label: 'CRITICAL',
      className: 'bg-red-100 text-red-700',
      icon: '🔴'
    },
  };

  // Default to LOW if riskLevel is invalid
  const { label, className, icon } = config[level] || config.low;

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
};

export default RiskBadge;