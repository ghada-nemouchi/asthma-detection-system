import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { 
  Users, AlertTriangle, Activity, TrendingUp, Search, Bell, Clock, ArrowRight,
  LogOut, RefreshCw, UserPlus, FileText, Shield, ChevronDown, ChevronRight
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import RiskBadge from '../components/RiskBadge';
import AlertPanel from '../components/AlertPanel';

const Dashboard = () => {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    highRiskPatients: 0,
    criticalPatients: 0,
    activeAlerts: 0,
    avgRiskScore: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    try {
      const response = await api.get('/patients');
      const patientsData = response.data.patients || response.data;
      setPatients(patientsData);
      
      const highRisk = patientsData.filter(p => p.riskLevel === 'high' || p.riskLevel === 'High').length;
      const critical = patientsData.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'Critical').length;
      const avgRisk = patientsData.length > 0 
        ? patientsData.reduce((sum, p) => sum + (p.riskScore || 0), 0) / patientsData.length 
        : 0;
      
      setStats(prev => ({
        ...prev,
        totalPatients: patientsData.length,
        highRiskPatients: highRisk,
        criticalPatients: critical,
        avgRiskScore: Math.round(avgRisk * 100),
      }));
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  }, []);

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get('/alerts/recent');
      const alertsData = response.data;
      setAlerts(alertsData);
      setStats(prev => ({
        ...prev,
        activeAlerts: alertsData.filter(a => !a.isRead).length,
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchPatients(), fetchAlerts()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPatients, fetchAlerts]);

  // Socket.io for real-time alerts
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.emit('join-doctors-room');
    socket.on('new_alert', () => {
      fetchAlerts(); // refresh alerts when new one arrives
    });
    return () => socket.disconnect();
  }, [fetchAlerts]);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleRefresh = () => fetchData();
  const handleAddPatient = () => navigate('/patients/new');

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  AsthmiCare
                </h1>
                <p className="text-sm text-gray-500">Clinical Dashboard • Real-time Monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-sm text-green-700 font-medium">Live Connection</span>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span className="text-sm hidden sm:inline">Refresh</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-semibold">
                      {user?.name?.charAt(0) || 'D'}
                    </span>
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-semibold text-gray-800">{user?.name || 'Dr. Sarah Johnson'}</p>
                    <p className="text-xs text-gray-500">Pulmonologist</p>
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                
                {showQuickActions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowQuickActions(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-green-500 via-green-600 to-blue-500 rounded-2xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'Doctor'} 👋
              </h2>
              <p className="text-green-50 opacity-95">
                Here's your clinical overview. {stats.highRiskPatients + stats.criticalPatients} patients require attention.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">{stats.activeAlerts}</p>
                <p className="text-xs opacity-90">Active Alerts</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">{new Date().toLocaleDateString()}</p>
                <p className="text-xs opacity-90">Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Patients" value={stats.totalPatients} icon={Users} color="blue" />
          <StatsCard title="High Risk" value={stats.highRiskPatients} icon={AlertTriangle} color="orange" />
          <StatsCard title="Critical" value={stats.criticalPatients} icon={AlertTriangle} color="red" />
          <StatsCard title="Avg Risk Score" value={`${stats.avgRiskScore}%`} icon={TrendingUp} color="green" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button onClick={handleAddPatient} className="card p-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200">
                <UserPlus className="text-green-600" size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">Add Patient</p>
                <p className="text-xs text-gray-500">Register new patient</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-green-500" />
          </button>
          
          <button className="card p-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">View Reports</p>
                <p className="text-xs text-gray-500">Monthly summary</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500" />
          </button>
          
          <button className="card p-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200">
                <Shield className="text-purple-600" size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">Risk Guidelines</p>
                <p className="text-xs text-gray-500">Clinical protocols</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-purple-500" />
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Users size={22} className="text-green-500" />
                      My Patients
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {filteredPatients.length} patients • {stats.highRiskPatients + stats.criticalPatients} at risk
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No patients found</p>
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
                    <div
                      key={patient._id}
                      onClick={() => navigate(`/patient/${patient._id}`)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-semibold text-green-600">
                              {patient.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-gray-800 group-hover:text-green-600 truncate">
                                {patient.name}
                              </h3>
                              <RiskBadge riskLevel={patient.riskLevel || 'low'} />
                            </div>
                            <p className="text-sm text-gray-500 truncate">{patient.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">Age: {patient.age || '--'} yrs</span>
                              <span className="text-xs text-gray-500">Risk: {patient.riskScore ? Math.round(patient.riskScore * 100) : 0}%</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-bold text-gray-800">
                              {patient.riskScore ? `${Math.round(patient.riskScore * 100)}%` : '--'}
                            </div>
                            <p className="text-xs text-gray-500">Risk Score</p>
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-gray-400 group-hover:text-green-500 ml-4 flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="lg:col-span-1">
            <AlertPanel alerts={alerts} onRefresh={fetchAlerts} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;