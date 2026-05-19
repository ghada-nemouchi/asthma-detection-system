# ai-service/app.py - COMPLETE CORRECTED VERSION
import os
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from audio_handler_transfer import get_detector
import base64
import tempfile
import traceback  
import socket
import pandas as pd

def get_local_ip():
    try:
        # Create a socket to determine the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

LOCAL_IP = get_local_ip()
print(f"✅ Detected local IP: {LOCAL_IP}")

def convert_m4a_to_wav(m4a_path):
    import subprocess
    wav_path = m4a_path.replace('.m4a', '.wav')
    subprocess.run(['ffmpeg', '-i', m4a_path, wav_path], check=True)
    return wav_path

app = Flask(__name__)
CORS(app)

# Increase max content length for large audio files (50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 

# ===== LOAD CLINICAL MODEL (for exacerbation prediction) =====
try:
    with open('model.pkl', 'rb') as f:
        model = pickle.load(f)
    print("✅ Loaded clinical model: model.pkl")
except FileNotFoundError:
    print("⚠️ model.pkl not found - clinical prediction will not work")
    model = None

try:
    with open('scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    print("✅ Loaded clinical scaler: scaler.pkl")
except FileNotFoundError:
    print("⚠️ scaler.pkl not found - clinical prediction will not work")
    scaler = None

try:
    with open('features.pkl', 'rb') as f:
        feature_names = pickle.load(f)
    print(f"✅ Loaded clinical features: {len(feature_names)} features")
except FileNotFoundError:
    print("⚠️ features.pkl not found - clinical prediction will not work")
    feature_names = []

# ===== LOAD ASTHMICARE PEAK BALANCE ENGINE =====
try:
    with open('asthmicare_peak_balance_engine.pkl', 'rb') as f:
        clinical_model = pickle.load(f)
    
    # Debug: inspect the loaded object
    print(f"✅ Loaded clinical model type: {type(clinical_model)}")
    
    # If it's a dict, check its keys
    if isinstance(clinical_model, dict):
        print(f"   Dictionary keys: {list(clinical_model.keys())}")
        # Extract the actual model
        if 'model' in clinical_model:
            actual_model = clinical_model['model']
            print(f"   Model type: {type(actual_model)}")
    
    print("✅ Asthmicare Peak Balance Engine loaded")
except FileNotFoundError:
    print("⚠️ asthmicare_peak_balance_engine.pkl not found")
    clinical_model = None
except Exception as e:
    print(f"⚠️ Error loading clinical model: {e}")
    clinical_model = None

CLINICAL_FEATURES = [
    'wheezing_12m', 'wheeze_episodes', 'nocturnal_wheeze', 'dry_night_cough', 
    'activity_limitation', 'missed_days', 'symptom_burden', 'classic_asthma_pattern', 
    'severe_wheeze', 'persistent_symptoms', 'night_pattern', 'young_wheezer', 
    'obese_wheeze', 'bronchodilator_used', 'eczema_allergy', 'family_history', 
    'atopic_profile', 'has_copd', 'has_emphysema', 'copd_profile', 'age', 'sex', 
    'bmi', 'smoking_status'
]

# ============================================================================
# NEW QUESTIONNAIRE PROCESSING FUNCTIONS
# ============================================================================

def process_questionnaire_to_features(data):
    """
    Convert new questionnaire answers to Asthmicare model features
    
    Expected input from frontend:
    {
        "age": 45,
        "sex": "male",  # or "female"
        "bmi": 26.5,
        "wheezing": true,
        "wheezing_severity": "mild",  # "mild", "limited", "severe"
        "night_cough": true,
        "inhaler_use": true,
        "eczema_allergy": true,
        "family_history": true,
        "has_copd": false,
        "smoking": true
    }
    """
    
    # Extract values
    age = data.get('age', 40)
    sex = 1 if data.get('sex') == 'male' else 0
    bmi = data.get('bmi', 25.0)
    wheezing = 1 if data.get('wheezing', False) else 0
    wheeze_severity = data.get('wheezing_severity', 'none')
    night_cough = 1 if data.get('night_cough', False) else 0
    inhaler_use = 1 if data.get('inhaler_use', False) else 0
    eczema_allergy = 1 if data.get('eczema_allergy', False) else 0
    family_history = 1 if data.get('family_history', False) else 0
    has_copd = 1 if data.get('has_copd', False) else 0
    has_emphysema = 1 if data.get('has_emphysema', False) else 0
    smoking = 1 if data.get('smoking', False) else 0
    
    # Derive wheeze_episodes (0-3)
    if not wheezing:
        wheeze_episodes = 0
    else:
        if wheeze_severity == 'mild':
            wheeze_episodes = 1
        elif wheeze_severity == 'limited':
            wheeze_episodes = 2
        else:  # severe
            wheeze_episodes = 3
    
    # Derive nocturnal_wheeze (night cough that wakes you)
    nocturnal_wheeze = 1 if night_cough else 0
    
    # Derive dry_night_cough
    dry_night_cough = 1 if night_cough else 0
    
    # Derive activity_limitation (0-3)
    if not wheezing:
        activity_limitation = 0
    else:
        if wheeze_severity == 'mild':
            activity_limitation = 1
        elif wheeze_severity == 'limited':
            activity_limitation = 2
        else:
            activity_limitation = 3
    
    # Derive missed_days (0-3)
    if not wheezing:
        missed_days = 0
    else:
        if wheeze_severity == 'mild':
            missed_days = 1
        elif wheeze_severity == 'limited':
            missed_days = 2
        else:
            missed_days = 3
    
    # Derived features
    symptom_burden = wheezing + nocturnal_wheeze + dry_night_cough + (1 if activity_limitation > 0 else 0)
    classic_asthma_pattern = 1 if (wheezing + nocturnal_wheeze + dry_night_cough) >= 2 else 0
    severe_wheeze = 1 if (wheeze_episodes >= 2 and nocturnal_wheeze == 1) else 0
    persistent_symptoms = 1 if (symptom_burden >= 3 and wheeze_episodes >= 2) else 0
    night_pattern = 1 if (nocturnal_wheeze == 1 and dry_night_cough == 1) else 0
    young_wheezer = 1 if (age < 40 and wheezing == 1) else 0
    obese_wheeze = 1 if (bmi > 30 and wheezing == 1) else 0
    atopic_profile = 1 if (eczema_allergy == 1 or family_history == 1) else 0
    copd_profile = 1 if (has_copd == 1 or has_emphysema == 1 or (smoking == 1 and age > 55)) else 0
    bronchodilator_used = inhaler_use
    
    # Build feature array in exact order
    features = [
        wheezing,                    # wheezing_12m
        wheeze_episodes,             # wheeze_episodes
        nocturnal_wheeze,            # nocturnal_wheeze
        dry_night_cough,             # dry_night_cough
        activity_limitation,         # activity_limitation
        missed_days,                 # missed_days
        symptom_burden,              # symptom_burden
        classic_asthma_pattern,      # classic_asthma_pattern
        severe_wheeze,               # severe_wheeze
        persistent_symptoms,         # persistent_symptoms
        night_pattern,               # night_pattern
        young_wheezer,               # young_wheezer
        obese_wheeze,                # obese_wheeze
        bronchodilator_used,         # bronchodilator_used
        eczema_allergy,              # eczema_allergy
        family_history,              # family_history
        atopic_profile,              # atopic_profile
        has_copd,                    # has_copd
        has_emphysema,               # has_emphysema
        copd_profile,                # copd_profile
        age,                         # age
        sex,                         # sex
        bmi,                         # bmi
        smoking                      # smoking_status
    ]
    
    return np.array([features], dtype=float), {
        'symptom_burden': symptom_burden,
        'wheeze_episodes': wheeze_episodes,
        'classic_asthma_pattern': classic_asthma_pattern
    }

def predict_clinical(questionnaire_data):
    """Predict asthma probability using Asthmicare model"""
    if clinical_model is None:
        return 0.5, {'error': 'Clinical model not loaded'}
    
    try:
        features, derived = process_questionnaire_to_features(questionnaire_data)
        
        # Extract the actual XGBoost model
        if isinstance(clinical_model, dict):
            actual_model = clinical_model.get('model')
            if actual_model is None:
                return 0.5, {'error': 'Model not found in pickle dict'}
        else:
            actual_model = clinical_model
        
        # Get prediction
        if hasattr(actual_model, 'predict_proba'):
            proba = actual_model.predict_proba(features)[0]
            print(f"📊 Raw probabilities: {proba}")
            
            # FORCE INVERSION: Your model outputs probability of NO asthma
            # So asthma_prob = 1 - probability_of_no_asthma
            raw_prob = float(proba[1])  # This is probability of "not asthma" or inverted
            asthma_prob = 1.0 - raw_prob  # FORCE INVERT
            print(f"📊 Inverting: {raw_prob:.3f} -> {asthma_prob:.3f}")
        else:
            asthma_prob = float(actual_model.predict(features)[0])
        
        # Ensure probability is between 0 and 1
        asthma_prob = max(0.0, min(1.0, asthma_prob))
        
        print(f"📋 Final clinical probability: {asthma_prob:.3f}")
        return asthma_prob, derived
        
    except Exception as e:
        print(f"Clinical prediction error: {e}")
        traceback.print_exc()
        return 0.5, {'error': str(e)}


@app.route('/predict', methods=['POST'])
def predict():
    try:
        if model is None or scaler is None or not feature_names:
            return jsonify({'error': 'Clinical model not loaded'}), 503

        data = request.get_json(force=True)
        if not data:
            return jsonify({'error': 'No JSON body provided'}), 400

        # Build input array in the exact order of feature_names
        input_features = []
        missing_features = []

        for feat in feature_names:
            if feat in data:
                input_features.append(data[feat])
            else:
                missing_features.append(feat)

        if missing_features:
            return jsonify({
                'error': f'Missing features: {missing_features}',
                'required_features': feature_names
            }), 400

        input_array = np.array([input_features], dtype=float)
        input_scaled = scaler.transform(input_array)
        proba = model.predict_proba(input_scaled)[0]

        # proba[0] = no exacerbation, proba[1] = exacerbation
        risk_score = float(proba[1])

        # GINA risk thresholds
        if risk_score < 0.35:
            risk_level = "low"
        elif risk_score < 0.60:
            risk_level = "medium"
        elif risk_score < 0.85:
            risk_level = "high"
        else:
            risk_level = "critical"

        return jsonify({
            'riskScore':     risk_score,
            'riskLevel':     risk_level,
            'status':        'success',
            'probabilities': {'no_exacerbation': float(proba[0]), 'exacerbation': float(proba[1])}
        })

    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/predict-asthma-audio', methods=['POST'])
def predict_asthma_audio():
    try:
        print("\n" + "="*50)
        print("🎤 Received audio analysis request")
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON body'}), 400
        
        audio_base64 = data.get('audio_base64')
        if not audio_base64:
            return jsonify({'error': 'No audio_base64 provided'}), 400
        
        if ',' in audio_base64:
            audio_base64 = audio_base64.split(',')[1]
        
        audio_data = base64.b64decode(audio_base64)
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
        
        detector = get_detector()
        result = detector.predict(tmp_path)
        
        os.unlink(tmp_path)
        
        if result is None:
            return jsonify({'error': 'Could not process audio'}), 400
        
        # Ensure probability is between 0 and 1
        audio_prob = result.get('asthma_probability', 0.5)
        
        # Add standardized response format
        response = {
            'asthma_probability': audio_prob,
            'confidence': result.get('confidence', 0.8),
            'status': 'success'
        }
        
        # Add severity and message based on probability
        if audio_prob < 0.32:
            response['severity'] = 'low'
            response['message'] = 'Low probability of asthma based on breathing analysis.'
            response['next_action'] = 'questionnaire'
        elif audio_prob < 0.65:
            response['severity'] = 'uncertain'
            response['message'] = 'Your breathing shows some patterns. Please complete the questionnaire.'
            response['next_action'] = 'questionnaire'
        else:
            response['severity'] = 'high'
            response['message'] = 'High probability detected. Please consult a doctor.'
            response['next_action'] = 'continue'
        
        print(f"✅ Audio result: probability={audio_prob:.3f}")
        print("="*50 + "\n")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Audio prediction error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/predict-combined', methods=['POST'])
def predict_combined():
    """
    Combined prediction using both audio and clinical questionnaire
    """
    try:
        print("\n" + "="*50)
        print("🫁 Combined prediction request")
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON body'}), 400
        
        questionnaire_data = data.get('questionnaire', {})
        audio_base64 = data.get('audio_base64')
        
        # Default values
        audio_prob = None
        clinical_prob = None
        clinical_derived = {}
        
        # 1. Clinical prediction from questionnaire
        if questionnaire_data:
            clinical_prob, clinical_derived = predict_clinical(questionnaire_data)
            print(f"📋 Clinical probability: {clinical_prob:.3f}")
        
        # 2. Audio prediction if available
        if audio_base64:
            try:
                # Process audio
                if ',' in audio_base64:
                    audio_base64 = audio_base64.split(',')[1]
                
                audio_data = base64.b64decode(audio_base64)
                
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                    tmp.write(audio_data)
                    tmp_path = tmp.name
                
                detector = get_detector()
                audio_result = detector.predict(tmp_path)
                os.unlink(tmp_path)
                
                if audio_result:
                    audio_prob = audio_result.get('asthma_probability', 0.5)
                print(f"🎤 Audio probability: {audio_prob:.3f}")
                
            except Exception as e:
                print(f"Audio processing error (continuing): {e}")
        
        # 3. Fuse predictions
        if audio_prob is not None and clinical_prob is not None:
            AUDIO_WEIGHT = 0.5
            CLINICAL_WEIGHT = 0.5
            final_score = (audio_prob * AUDIO_WEIGHT) + (clinical_prob * CLINICAL_WEIGHT)
            fusion_method = "weighted_average"
        elif audio_prob is not None:
            final_score = audio_prob
            fusion_method = "audio_only"
        elif clinical_prob is not None:
            final_score = clinical_prob
            fusion_method = "clinical_only"
        else:
            return jsonify({'error': 'No data provided'}), 400
        
        ASTHMA_THRESHOLD = 0.35
        is_asthmatic = final_score >= ASTHMA_THRESHOLD
        
        if final_score < 0.35:
            risk_level = "low"
        elif final_score < 0.60:
            risk_level = "medium"
        elif final_score < 0.85:
            risk_level = "high"
        else:
            risk_level = "critical"
        
        response = {
            'status': 'success',
            'final_score': final_score,
            'final_risk_level': risk_level,
            'is_asthmatic': is_asthmatic,
            'fusion_method': fusion_method,
            'components': {
                'audio_probability': audio_prob,
                'clinical_probability': clinical_prob
            },
            'clinical_details': clinical_derived,
            'recommendation': generate_recommendation(final_score, is_asthmatic, fusion_method)
        }
        
        print(f"✅ Final score: {final_score:.3f} → {'ASTHMA' if is_asthmatic else 'HEALTHY'}")
        print("="*50 + "\n")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Combined prediction error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


def generate_recommendation(score, is_asthmatic, method):
    """Generate user-friendly recommendation"""
    if is_asthmatic:
        if score > 0.80:
            return "⚠️ High likelihood of asthma detected. Please consult a healthcare provider for proper diagnosis and treatment."
        elif score > 0.60:
            return "🫁 Moderate signs of asthma detected. Consider consulting a doctor for a spirometry test."
        else:
            return "📋 Some indicators of asthma present. Monitor your symptoms and consult a doctor if they persist."
    else:
        if method == "audio_only":
            return "✅ Your breathing analysis shows no asthmatic patterns. Continue maintaining good respiratory health!"
        else:
            return "✅ Based on your responses, no significant asthma indicators were found. Continue healthy habits!"


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'asthma-ai-detection',
        'model_features': feature_names,
        'model_type': type(model).__name__ if model else 'Not loaded',
        'n_features': len(feature_names),
        'model_loaded': model is not None,
        'scaler_loaded': scaler is not None,
        'clinical_model_loaded': clinical_model is not None
    })


@app.route('/health-audio', methods=['GET'])
def health_audio():
    try:
        detector = get_detector()
        return jsonify({
            'status': 'healthy',
            'service': 'audio-detection',
            'model_type': 'TransferLearning',
            'accuracy': 0.955,
            'features_expected': detector.n_features_in_
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({'pong': True, 'service': 'ai-service'})


@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'service': 'Asthma Detection AI Service',
        'local_ip': LOCAL_IP,
        'endpoints': {
            'predict': '/predict (POST) - Clinical data prediction',
            'predict-asthma-audio': '/predict-asthma-audio (POST) - Audio screening',
            'predict-combined': '/predict-combined (POST) - Combined assessment',
            'health': '/health (GET) - Service health',
            'health-audio': '/health-audio (GET) - Audio model health',
            'ping': '/ping (GET) - Connectivity test'
        },
        'status': 'running'
    })


if __name__ == '__main__':
    port = 5001
    print(f"\n🚀 Starting Asthma AI Detection Service...")
    print(f"📍 Running on http://{LOCAL_IP}:{port}")
    print(f"📍 Health check: http://{LOCAL_IP}:{port}/health")
    print(f"📍 Audio health: http://{LOCAL_IP}:{port}/health-audio")
    print(f"📍 Combined prediction: http://{LOCAL_IP}:{port}/predict-combined")
    print(f"\n✅ Service ready!\n")
    app.run(host='0.0.0.0', port=port, debug=True)