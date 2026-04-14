// src/pages/PatientDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  ArrowLeft, 
  Activity, 
  Heart, 
  Wind, 
  Droplets,
  Phone,
  Mail,
  Bell,
  MapPin,
  AlertCircle,
  TrendingUp,
  Clock,
  Calendar,
  Download,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import VitalsChart from '../components/VitalsChart';

const PatientDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('vitals');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Fetch patient data
  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/patients/${patientId}`);
      setPatient(response.data);
    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('Patient not found');
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient readings
  const fetchReadings = async () => {
    try {
      const response = await api.get(`/patients/${patientId}/readings`);
      setReadings(response.data);
    } catch (err) {
      console.error('Error fetching readings:', err);
    }
  };

  useEffect(() => {
    fetchPatientData();
    fetchReadings();
  }, [patientId]);

  // Handle delete patient
  const handleDelete = async () => {
    try {
      await api.delete(`/patients/${patientId}`);
      navigate('/dashboard', { 
        replace: true,
        state: { message: 'Patient deleted successfully' }
      });
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError('Failed to delete patient');
    }
  };

  // Handle edit patient
  const handleEdit = () => {
    navigate(`/patients/${patientId}/edit`);
  };

  // Handle export report
  const handleExport = async () => {
    try {
      const response = await api.get(`/patients/${patientId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `patient-${patientId}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting report:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div 
            className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4"
            aria-label="Loading patient data"
          ></div>
          <p className="text-gray-600 font-medium">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-800">{error || 'Patient not found'}</h3>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-green-500 text-white px-6 py-2 rounded-xl hover:bg-green-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={24} className="text-gray-600" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{patient.name}</h1>
              <p className="text-gray-500 mt-1">Patient ID: {patient._id?.slice(-6) || patientId.slice(-6)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
              aria-label="Export patient report"
            >
              <Download size={18} aria-hidden="true" />
              Export Report
            </button>
            <button
              onClick={handleEdit}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
              aria-label="Edit patient"
            >
              <Edit size={18} aria-hidden="true" />
              Edit
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2"
              aria-label="Delete patient"
            >
              <Trash2 size={18} aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>

        {/* Patient Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Activity className="text-blue-600" size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="text-xl font-semibold text-gray-800">{patient.age || '--'} years</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Heart className="text-red-600" size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Risk</p>
                <RiskBadge riskLevel={patient.riskLevel || 'low'} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Wind className="text-purple-600" size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Asthma Severity</p>
                <p className="text-sm font-medium text-gray-800">
                  {patient.asthmaSeverity || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Droplets className="text-green-600" size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className="text-xl font-semibold text-gray-800">{patient.riskScore || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-gray-400" aria-hidden="true" />
              <span className="text-gray-700">{patient.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-gray-400" aria-hidden="true" />
              <span className="text-gray-700">{patient.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-gray-400" aria-hidden="true" />
              <span className="text-gray-700">
                {patient.address?.city || patient.address || 'Not provided'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" aria-hidden="true" />
              <span className="text-gray-700">
                Registered: {new Date(patient.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('vitals')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'vitals'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="View vitals history"
          >
            Vitals History
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="View alert history"
          >
            Alert History
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'medications'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="View medications"
          >
            Medications
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'vitals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {readings.length > 0 ? (
              <>
                <VitalsChart 
                  data={readings}
                  title="PEF (% of personal best)"
                  dataKey="pef_norm"
                  color="#10b981"
                  yAxisDomain={[0, 1]}
                  yAxisFormatter={(v) => `${Math.round(v * 100)}%`}
                  xAxisDataKey="timestamp"
                />
                <VitalsChart 
                  data={readings}
                  title="Reliever Puffs (last 24h)"
                  dataKey="relief_use"
                  color="#ef4444"
                  chartType="bar"
                  yAxisDomain={[0, 'auto']}
                  yAxisFormatter={(v) => `${v} puffs`}
                  xAxisDataKey="timestamp"
                />
                <VitalsChart 
                  data={readings}
                  title="Risk Score"
                  dataKey="riskScore"
                  color="#f59e0b"
                  yAxisDomain={[0, 1]}
                  yAxisFormatter={(v) => `${Math.round(v * 100)}%`}
                  xAxisDataKey="timestamp"
                />
              </>
            ) : (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl">
                <Activity size={48} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                <p className="text-gray-500">No readings yet. Please submit a daily report.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Alert History</h3>
            <div className="space-y-3">
              {patient.alerts?.length > 0 ? (
                patient.alerts.map((alert, index) => (
                  <div key={index} className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-red-700">
                        {alert.type || 'Critical Alert'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{alert.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bell size={48} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                  <p className="text-gray-500">No alerts recorded</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Medications</h3>
            <div className="space-y-3">
              {patient.medications?.length > 0 ? (
                patient.medications.map((med, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{med.name}</p>
                        <p className="text-sm text-gray-500">{med.dosage} - {med.frequency}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        Prescribed: {new Date(med.prescribedDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity size={48} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                  <p className="text-gray-500">No medications recorded</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Patient</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {patient.name}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;