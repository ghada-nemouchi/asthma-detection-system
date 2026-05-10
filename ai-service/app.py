# ai-service/app.py - CORRECTED INDENTATION
import os
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from audio_handler import get_detector
import base64
import tempfile
import traceback  # ADD THIS IMPORT

app = Flask(__name__)
CORS(app)

# Increase max content length for large audio files (50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 

# Load model, scaler, and feature names
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

with open('features.pkl', 'rb') as f:
    feature_names = pickle.load(f)
    # ['pef_pct_pb', 'pef_slope_3d', 'rescue_puffs', 'rescue_used',
    #  'rescue_roll3_sum', 'rescue_roll3_days', 'symptom_score',
    #  'hr_pct_bl', 'steps_pct_bl', 'pef_drop_rescue', 'pollen_enc', 'cold_flag']

@app.route('/predict', methods=['POST'])
def predict():
    try:
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
        
        # Run prediction
        detector = get_detector()
        result = detector.predict(tmp_path)
        
        # Cleanup
        os.unlink(tmp_path)
        print(f"🗑️ Temporary file deleted")
        
        if result is None:
            print("❌ Prediction returned None")
            return jsonify({'error': 'Could not process audio'}), 400
        
        print(f"✅ Returning result: {result['severity']}")
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
        'model_type':     type(model).__name__,
        'n_features':     len(feature_names),
        'model_loaded':   model is not None,
        'scaler_loaded':  scaler is not None
    })

@app.route('/health-audio', methods=['GET'])
def health_audio():
    """Check if audio model is loaded"""
    try:
        detector = get_detector()
        return jsonify({
            'status': 'healthy',
            'service': 'audio-detection',
            'model_type': type(detector.model).__name__,
            'features_expected': detector.model.n_features_in_,
            'accuracy': 0.7011
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
    port = int(os.environ.get('PORT', 5001))
    print(f"\n🚀 Starting Asthma AI Detection Service...")
    print(f"📍 Running on http://localhost:{port}")
    print(f"📍 Health check: http://localhost:{port}/health")
    print(f"📍 Audio health: http://localhost:{port}/health-audio")
    print(f"📍 Prediction endpoint: http://localhost:{port}/predict-asthma-audio")
    print(f"\n✅ Service ready!\n")
    app.run(host='0.0.0.0', port=port, debug=True)