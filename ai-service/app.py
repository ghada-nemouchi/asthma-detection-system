# ai-service/app.py - CORRECTED INDENTATION
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

# ai-service/app.py - Update the predict_asthma_audio function

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
        
        print(f"📊 Audio base64 length: {len(audio_base64)} characters")
        
        # Handle data URL prefix if present
        if ',' in audio_base64:
            audio_base64 = audio_base64.split(',')[1]
            print("📊 Removed data URL prefix")
        
        # Decode and save to temp file
        audio_data = base64.b64decode(audio_base64)
        print(f"📊 Decoded audio size: {len(audio_data)} bytes")
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
            print(f"📁 Temporary file created: {tmp_path}")
        
        # Run prediction - now returns just raw probability
        detector = get_detector()
        result = detector.predict(tmp_path)
        
        # Cleanup
        os.unlink(tmp_path)
        print(f"🗑️ Temporary file deleted")
        
        if result is None:
            print("❌ Prediction returned None")
            return jsonify({'error': 'Could not process audio'}), 400
        
        # Add default message if not present (for backward compatibility)
        if 'message' not in result:
            prob = result['asthma_probability']
            if prob < 0.40:
                result['severity'] = 'low'
                result['message'] = 'Low probability of asthma. You appear healthy!'
                result['next_action'] = 'healthy_exit'
            elif prob < 0.65:
                result['severity'] = 'uncertain'
                result['message'] = 'Your results are inconclusive. Please complete the questionnaire for a more accurate assessment.'
                result['next_action'] = 'questionnaire'
            else:
                result['severity'] = 'high'
                result['message'] = 'High probability. Please consult a doctor.'
                result['next_action'] = 'continue_to_app'
        
        print(f"✅ Returning result: probability={result['asthma_probability']:.3f}")
        print("="*50 + "\n")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Audio prediction error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':         'healthy',
        'service':        'asthma-ai-detection',
        'model_features': feature_names,
        'model_type':     type(model).__name__ if model else 'Not loaded',
        'n_features':     len(feature_names),
        'model_loaded':   model is not None,
        'scaler_loaded':  scaler is not None
    })

# @app.route('/health-audio', methods=['GET'])
# def health_audio():
#     """Check if audio model is loaded"""
#     try:
#         detector = get_detector()
#         return jsonify({
#             'status': 'healthy',
#             'service': 'audio-detection',
#             'model_type': type(detector.model).__name__,
#             'features_expected': detector.model.n_features_in_,
            
#         })
#     except Exception as e:
#         return jsonify({'status': 'error', 'message': str(e)}), 500
@app.route('/health-audio', methods=['GET'])
def health_audio():
    """Check if audio model is loaded"""
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
# Simple ping endpoint for connectivity testing
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
    print(f"📍 Prediction endpoint: http://{LOCAL_IP}:{port}/predict-asthma-audio")
    print(f"\n✅ Service ready!\n")
    app.run(host='0.0.0.0', port=port, debug=True)