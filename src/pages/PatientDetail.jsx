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
  Calendar,
  Download,
  Edit,
  Trash2,
  Pill,
  History,
  Clock
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import VitalsChart from '../components/VitalsChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PatientDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('vitals');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // États pour l'édition du profil
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    age: '',
    phone: '',
    address: '',
    personalBestPef: '',
    asthmaSeverity: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // États pour l'édition des médicaments
  const [showMedModal, setShowMedModal] = useState(false);
  const [editMedForm, setEditMedForm] = useState({
    name: '',
    type: 'controller',
    dosage: '',
    frequency: ''
  });
  const [editingMedId, setEditingMedId] = useState(null);
  const [savingMed, setSavingMed] = useState(false);
  // Ajouter ces états avec les autres useState
  const [editingPersonalization, setEditingPersonalization] = useState(false);
  const [personalizedValues, setPersonalizedValues] = useState({
    personalBestPef: 400,
    baselineHr: 70,
    baselineSteps: 5000
  });
  const [calculatedMaxPef, setCalculatedMaxPef] = useState(null);
  const [savingPersonalization, setSavingPersonalization] = useState(false);

  // Fetch patient data
  const fetchPatientData = async () => {
    try {
      console.log('🔵 FETCHING patient data for:', patientId);
      setLoading(true);
      const response = await api.get(`/patients/${patientId}`);
      console.log('🔵 PATIENT DATA RECEIVED:', response.data);
      setPatient(response.data);
      setLoading(false);  // ✅ ADD THIS
    } catch (err) {
      console.error('🔴 Error fetching patient:', err);
      setError('Patient not found');
      setLoading(false);  // ✅ KEEP THIS
    }
  };



  // Fetch patient readings
  const fetchReadings = async () => {
  try {
    console.log('🔵 FETCHING readings for:', patientId);
    const response = await api.get(`/patients/${patientId}/readings`);
    console.log('🔵 READINGS RECEIVED:', response.data);
    setReadings(response.data);
  } catch (err) {
    console.error('🔴 Error fetching readings:', err);
  }
};
    // Handle export report
  const handleExport = async () => {
    try {
      console.log('🔵 EXPORT BUTTON CLICKED!');
      const response = await api.get(`/patients/${patientId}/export`, {
        responseType: 'blob'
      });
      
      // Read the CSV data
      const csvText = await response.data.text();
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      const rows = lines.slice(1).filter(line => line.trim()).map(line => line.split(','));
      
      // Create PDF
      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Patient Report: ${patient?.name || patientId}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Add table
      
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 }
        }
      });
      
      // Save PDF
      doc.save(`patient-${patient?.name || patientId}-report.pdf`);
      alert('PDF Report downloaded successfully');
      
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to download report: ' + (err.response?.data?.message || err.message));
    }
  };
  // Fetch alerts for this patient
  const fetchAlerts = async () => {
    try {
      const response = await api.get(`/patients/${patientId}/alerts`);
      setAlerts(response.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      // If endpoint doesn't exist yet, fallback to filtering from readings
      const highRiskReadings = readings.filter(r => 
        r.riskLevel === 'high' || r.riskLevel === 'critical'
      );
      setAlerts(highRiskReadings.map(r => ({
        _id: r._id,
        riskLevel: r.riskLevel,
        riskScore: r.riskScore,
        message: `${r.riskLevel.toUpperCase()} risk detected on ${new Date(r.timestamp).toLocaleDateString()}`,
        createdAt: r.timestamp,
        isRead: false
      })));
    }
  };

  // Fetch medications (you'll need to add this endpoint)
  const fetchMedications = async () => {
    try {
      //  Get from patient object if stored
      const response = await api.get(`/patients/${patientId}/medications`);
      setMedications(response.data);
    } catch (err) {
      console.log('No medications endpoint yet, using mock data');
      // Fallback: Show empty state or mock data
      setMedications([]);
    }
  };

  // Calculer le meilleur DEP depuis les lectures
  const calculateMaxPefFromReadings = () => {
    if (!readings || readings.length === 0) return null;
    
    const pefValues = readings
      .map(reading => {
        if (reading.pef_norm && patient?.personalBestPef) {
          return Math.round(reading.pef_norm * patient.personalBestPef);
        }
        return null;
      })
      .filter(v => v !== null && !isNaN(v));
    
    if (pefValues.length === 0) return null;
    return Math.max(...pefValues);
  };

  // Mettre à jour les valeurs personnalisées
  const updatePersonalizedValue = (field, value) => {
    setPersonalizedValues(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  // Sauvegarder les modifications
  const savePersonalization = async () => {
    setSavingPersonalization(true);
    try {
      const response = await api.put(`/patients/${patientId}/personalization`, {
        personalBestPef: personalizedValues.personalBestPef,
        baselineHr: personalizedValues.baselineHr,
        baselineSteps: personalizedValues.baselineSteps
      });
      
      if (response.data.success) {
        // Mettre à jour l'affichage
        setPatient(prev => ({
          ...prev,
          personalBestPef: personalizedValues.personalBestPef,
          baselineHr: personalizedValues.baselineHr,
          baselineSteps: personalizedValues.baselineSteps
        }));
        setEditingPersonalization(false);
        alert('✅ Valeurs personnalisées sauvegardées !');
      }
    } catch (err) {
      console.error('Error saving personalization:', err);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSavingPersonalization(false);
    }
  };

  // ========== PROFIL ==========
const openEditModal = () => {
  setEditProfileForm({
    name: patient.name || '',
    age: patient.age ? String(patient.age) : '',
    phone: patient.phone || '',
    address: patient.address || '',
    personalBestPef: patient.personalBestPef ? String(patient.personalBestPef) : '',
    asthmaSeverity: patient.asthmaSeverity || ''
  });
  setShowEditModal(true);
};

const saveProfileEdit = async () => {
  setSavingProfile(true);
  try {
    const response = await api.put(`/patients/${patientId}`, {
      name: editProfileForm.name,
      age: editProfileForm.age ? parseInt(editProfileForm.age) : null,
      phone: editProfileForm.phone,
      address: editProfileForm.address,
      personalBestPef: editProfileForm.personalBestPef ? parseInt(editProfileForm.personalBestPef) : null,
      asthmaSeverity: editProfileForm.asthmaSeverity
    });
    
    if (response.data) {
      setPatient(prev => ({ ...prev, ...response.data }));
      setShowEditModal(false);
      alert('✅ Patient profile updated successfully');
      fetchPatientData();
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    alert('❌ Failed to update profile');
  } finally {
    setSavingProfile(false);
  }
};

// ========== MÉDICAMENTS ==========
  const openMedModal = (med = null) => {
    if (med) {
      setEditingMedId(med._id);
      setEditMedForm({
        name: med.name || '',
        type: med.type || 'controller',
        dosage: med.dosage || '',
        frequency: med.frequency || ''
      });
    } else {
      setEditingMedId(null);
      setEditMedForm({
        name: '',
        type: 'controller',
        dosage: '',
        frequency: ''
      });
    }
    setShowMedModal(true);
  };

  const saveMedication = async () => {
    if (!editMedForm.name) {
      alert('Please enter medication name');
      return;
    }
    
    setSavingMed(true);
    try {
      if (editingMedId) {
        // Update existing medication
        await api.put(`/patients/${patientId}/medications/${editingMedId}`, editMedForm);
        alert('✅ Medication updated');
      } else {
  
        // Add new medication - make sure all fields are sent correctly
        const medicationData = {
          name: editMedForm.name,
          type: editMedForm.type,
          dosage: editMedForm.dosage,
          frequency: editMedForm.frequency,
          isActive: true
        };
        console.log('📤 Sending medication:', medicationData);
        await api.post(`/patients/${patientId}/medications`, medicationData);
        alert('✅ Medication added');
      }
      setShowMedModal(false);
      await fetchMedications(); // Refresh the list
    } catch (err) {
      console.error('Error saving medication:', err);
      console.error('Response:', err.response?.data);
      alert('❌ Failed to save medication: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingMed(false);
    }
  };

  const deleteMedication = async (medId, medName) => {
    if (window.confirm(`Delete ${medName}?`)) {
      try {
        await api.delete(`/patients/${patientId}/medications/${medId}`);
        alert('✅ Medication deleted');
        fetchMedications();
      } catch (err) {
        console.error('Error deleting medication:', err);
        alert('❌ Failed to delete medication');
      }
    }
  };
  // Calculer depuis les lectures
  const handleCalculateFromReadings = () => {
    const maxPef = calculateMaxPefFromReadings();
    if (maxPef) {
      setCalculatedMaxPef(maxPef);
      setPersonalizedValues(prev => ({
        ...prev,
        personalBestPef: maxPef
      }));
    } else {
      alert('⚠️ Pas assez de lectures pour calculer le meilleur DEP');
    }
  };
  useEffect(() => {
    console.log('🔵 useEffect triggered for patientId:', patientId);
    const loadData = async () => {
      await fetchPatientData();
      await fetchReadings();
      await fetchMedications();
    };
    loadData();
  }, [patientId]);

  useEffect(() => {
    if (readings.length > 0) {
      fetchAlerts();
    }
  }, [readings]);

  // Dans le useEffect principal, après fetchPatientData()
  useEffect(() => {
    if (patient) {
      setPersonalizedValues({
        personalBestPef: patient.personalBestPef || 400,
        baselineHr: patient.baselineHr || 70,
        baselineSteps: patient.baselineSteps || 5000
      });
      setCalculatedMaxPef(calculateMaxPefFromReadings());
    }
  }, [patient, readings]);
  // Handle delete patient
  // Handle remove patient from doctor's list
  const handleDelete = async () => {
    try {
      const response = await api.delete(`/patients/${patientId}`);
      navigate('/dashboard', { 
        replace: true,
        state: { 
          message: response.data.message || 'Patient removed from your list'
        }
      });
    } catch (err) {
      console.error('Error removing patient:', err);
      setError('Failed to remove patient');
    }
  };

  // Get risk color
  const getRiskColor = (riskLevel) => {
    switch(riskLevel?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
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
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{patient.name}</h1>
              <p className="text-gray-500 mt-1">Patient ID: {patient._id?.slice(-6) || patientId.slice(-6)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExport}
              className="bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer"
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
              <Download size={18} />
              Export Report
            </button>
            <button 
              onClick={openEditModal}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Edit size={18} />
              Edit Profile
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        {/* Patient Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Activity className="text-blue-600" size={22} />
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
                <Heart className="text-red-600" size={22} />
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
                <Wind className="text-purple-600" size={22} />
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
                <Droplets className="text-green-600" size={22} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className="text-xl font-semibold text-gray-800">
                  {patient.riskScore ? `${Math.round(patient.riskScore * 100)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-gray-400" />
              <span className="text-gray-700">{patient.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-gray-400" />
              <span className="text-gray-700">{patient.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-gray-400" />
              <span className="text-gray-700">
                {patient.address?.city || patient.address || 'Not provided'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" />
              <span className="text-gray-700">
                Registered: {new Date(patient.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {/* Section Personnalisation - AJOUTER APRÈS CONTACT INFORMATION */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-sm p-6 mb-8 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Edit size={20} className="text-purple-500" />
              🎯 Personnalisation du patient
            </h3>
            {!editingPersonalization ? (
              <button
                onClick={() => setEditingPersonalization(true)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
              >
                <Edit size={14} />
                Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPersonalization(false);
                    // Réinitialiser les valeurs
                    setPersonalizedValues({
                      personalBestPef: patient?.personalBestPef || 400,
                      baselineHr: patient?.baselineHr || 70,
                      baselineSteps: patient?.baselineSteps || 5000
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-1 rounded-lg border border-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={savePersonalization}
                  disabled={savingPersonalization}
                  className="bg-purple-500 text-white hover:bg-purple-600 text-sm font-medium px-3 py-1 rounded-lg flex items-center gap-1"
                >
                  {savingPersonalization ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    '💾 Sauvegarder'
                  )}
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meilleur DEP */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🌬️ Meilleur DEP (L/min)
              </label>
              {editingPersonalization ? (
                <input
                  type="number"
                  value={personalizedValues.personalBestPef}
                  onChange={(e) => updatePersonalizedValue('personalBestPef', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              ) : (
                <p className="text-2xl font-bold text-purple-600">
                  {patient?.personalBestPef || 400} L/min
                </p>
              )}
              {calculatedMaxPef && calculatedMaxPef !== patient?.personalBestPef && (
                <div className="mt-2">
                  <button
                    onClick={handleCalculateFromReadings}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    📊 Calculer depuis les lectures ({calculatedMaxPef} L/min)
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Utilisé pour normaliser toutes les lectures DEP
              </p>
            </div>
            
            {/* Baseline FC */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ❤️ FC baseline (BPM)
              </label>
              {editingPersonalization ? (
                <input
                  type="number"
                  value={personalizedValues.baselineHr}
                  onChange={(e) => updatePersonalizedValue('baselineHr', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              ) : (
                <p className="text-2xl font-bold text-purple-600">
                  {patient?.baselineHr || 70} BPM
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Fréquence cardiaque au repos
              </p>
            </div>
            
            {/* Baseline Steps */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👣 Pas baseline (pas/jour)
              </label>
              {editingPersonalization ? (
                <input
                  type="number"
                  value={personalizedValues.baselineSteps}
                  onChange={(e) => updatePersonalizedValue('baselineSteps', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              ) : (
                <p className="text-2xl font-bold text-purple-600">
                  {patient?.baselineSteps || 5000} pas/jour
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Moyenne quotidienne de pas
              </p>
            </div>
          </div>
          
          {/* Explication de l'impact */}
          {!editingPersonalization && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800">
                ⚠️ <span className="font-semibold">Impact sur les calculs :</span> Ces valeurs personnalisées sont utilisées pour :
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-yellow-700">
                <div>• Normaliser le DEP → <code className="bg-yellow-100 px-1 rounded">pef_norm = DEP / meilleur_DEP</code></div>
                <div>• Normaliser la FC → <code className="bg-yellow-100 px-1 rounded">hr_pct_bl = FC / baseline_FC × 100</code></div>
                <div>• Normaliser les pas → <code className="bg-yellow-100 px-1 rounded">steps_pct_bl = pas / baseline_pas × 100</code></div>
              </div>
            </div>
          )}
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
          >
            <div className="flex items-center gap-2">
              <Activity size={18} />
              Vitals History
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell size={18} />
              Alert History
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('medications')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'medications'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Pill size={18} />
              Medications
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'vitals' && (
          <div className="space-y-6">
            {/* Readings List - Like Mobile App */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <History size={20} className="text-green-500" />
                  Recent Readings
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {readings.length} readings recorded
                </p>
              </div>
              
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {readings.length === 0 ? (
                  <div className="p-12 text-center">
                    <Activity size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No readings yet</p>
                  </div>
                ) : (
                  readings.map((reading) => (
                    <div key={reading._id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm text-gray-500">{formatDate(reading.timestamp)}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(reading.riskLevel)}`}>
                              {reading.riskLevel?.toUpperCase() || 'LOW'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Risk Score</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {reading.riskScore ? `${Math.round(reading.riskScore * 100)}%` : '--'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">PEF</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {reading.pef_norm ? `${Math.round(reading.pef_norm * 100)}%` : '--'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Reliever</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {reading.relief_use || 0}/week
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Night Symptoms</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {reading.night_symptoms || 0}/7
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Day Symptoms</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {reading.day_symptoms || 0}/7
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Charts */}
            {readings.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  title="Risk Score Trend"
                  dataKey="riskScore"
                  color="#f59e0b"
                  yAxisDomain={[0, 1]}
                  yAxisFormatter={(v) => `${Math.round(v * 100)}%`}
                  xAxisDataKey="timestamp"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bell size={20} className="text-red-500" />
              Alert History
            </h3>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No alerts recorded</p>
                  <p className="text-sm text-gray-400 mt-1">Patient has no high or critical risk events</p>
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <div 
                    key={alert._id || index} 
                    className={`p-4 rounded-xl border ${
                      alert.riskLevel === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={18} className={alert.riskLevel === 'critical' ? 'text-red-600' : 'text-orange-600'} />
                        <span className={`text-sm font-semibold ${
                          alert.riskLevel === 'critical' ? 'text-red-700' : 'text-orange-700'
                        }`}>
                          {alert.riskLevel?.toUpperCase() || 'HIGH'} RISK ALERT
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">
                      {alert.message || `${alert.riskLevel?.toUpperCase()} risk detected with score ${Math.round((alert.riskScore || 0) * 100)}%`}
                    </p>
                    {alert.riskScore && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${alert.riskLevel === 'critical' ? 'bg-red-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min((alert.riskScore || 0) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Risk Score: {Math.round((alert.riskScore || 0) * 100)}%</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            {/* ✅ BOUTON AJOUTER/MODIFIER - AJOUTER ICI */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Pill size={20} className="text-blue-500" />
                Current Medications
              </h3>
              <button
                onClick={() => openMedModal()}
                className="bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2 text-sm"
              >
                <Edit size={16} />
                Add / Edit Medications
              </button>
            </div>
            
            {/* Reste du contenu (affichage des médicaments) */}
            {medications.length === 0 ? (
              <div className="text-center py-12">
                <Pill size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No medications recorded</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "Add / Edit Medications" to add prescriptions
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {medications.map((med) => (
                  <div key={med._id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{med.name}</p>
                        <p className="text-sm text-gray-500">
                          {med.dosage} - {med.frequency}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Type: <span className="capitalize">{med.type}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMedModal(med)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteMedication(med._id, med.name)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick info about common asthma meds */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">💊 Common Asthma Medications</h4>
              <p className="text-xs text-blue-700">
                Patients typically use rescue inhalers (albuterol) and controller medications (ICS, LABA, leukotriene modifiers).
                Click "Add / Edit Medications" to add or modify prescriptions.
              </p>
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
      {/* MODAL 1: ÉDITION DU PROFIL PATIENT */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Edit Patient Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={editProfileForm.name} onChange={(e) => setEditProfileForm({...editProfileForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input type="number" value={editProfileForm.age} onChange={(e) => setEditProfileForm({...editProfileForm, age: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={editProfileForm.phone} onChange={(e) => setEditProfileForm({...editProfileForm, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={editProfileForm.address} onChange={(e) => setEditProfileForm({...editProfileForm, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personal Best PEF (L/min)</label>
                <input type="number" value={editProfileForm.personalBestPef} onChange={(e) => setEditProfileForm({...editProfileForm, personalBestPef: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asthma Severity</label>
                <select value={editProfileForm.asthmaSeverity} onChange={(e) => setEditProfileForm({...editProfileForm, asthmaSeverity: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Not specified</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button>
              <button onClick={saveProfileEdit} disabled={savingProfile} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl disabled:opacity-50">
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AJOUT/ÉDITION DE MÉDICAMENT */}
      {showMedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {editingMedId ? 'Edit Medication' : 'Add Medication'}
              </h3>
              <button onClick={() => setShowMedModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
                <input type="text" value={editMedForm.name} onChange={(e) => setEditMedForm({...editMedForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Ventolin, Seretide" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={editMedForm.type} onChange={(e) => setEditMedForm({...editMedForm, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="rescue">Rescue (blue) - for attacks</option>
                  <option value="controller">Controller (orange) - daily maintenance</option>
                  <option value="biologic">Biologic - for severe asthma</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                <input type="text" value={editMedForm.dosage} onChange={(e) => setEditMedForm({...editMedForm, dosage: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., 2 puffs, 10mg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <input type="text" value={editMedForm.frequency} onChange={(e) => setEditMedForm({...editMedForm, frequency: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., twice daily, as needed" />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowMedModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl">Cancel</button>
              <button onClick={saveMedication} disabled={savingMed} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl disabled:opacity-50">
                {savingMed ? 'Saving...' : (editingMedId ? 'Update' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;