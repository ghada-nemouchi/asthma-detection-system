import React from 'react';
import { Bell, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AlertPanel = ({ alerts = [], onRefresh }) => {
  const getAlertIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return <XCircle className="text-red-500" size={20} />;
      case 'high': return <AlertTriangle className="text-orange-500" size={20} />;
      default: return <Bell className="text-yellow-500" size={20} />;
    }
  };

  // Transform alerts from backend (_id, patientId populated)
  const transformedAlerts = alerts.map(alert => ({
    id: alert._id,
    patientName: alert.patientId?.name || 'Unknown Patient',
    riskLevel: alert.riskLevel,
    riskScore: alert.riskScore,
    message: alert.message,
    timestamp: alert.createdAt,
    isRead: alert.isRead
  }));

  return (
    <div className="card sticky top-24">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bell size={22} className="text-red-500" />
            Recent Alerts
            {transformedAlerts.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {transformedAlerts.filter(a => !a.isRead).length}
              </span>
            )}
          </h2>
          {onRefresh && (
            <button onClick={onRefresh} className="text-gray-400 hover:text-gray-600">
              ↻
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {transformedAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 text-green-500" size={48} />
            <p className="text-gray-500 font-medium">All clear!</p>
            <p className="text-sm text-gray-400">No active alerts</p>
          </div>
        ) : (
          transformedAlerts.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.riskLevel)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-800">{alert.patientName}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      alert.riskLevel === 'critical' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {alert.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
                    <span>•</span>
                    <span>Risk Score: {(alert.riskScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertPanel;