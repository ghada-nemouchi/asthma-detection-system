import os
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # ✅ allow cross-origin requests from Node.js

# Load model, scaler, and feature names
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

with open('features.pkl', 'rb') as f:
    feature_names = pickle.load(f)   # ['night_symptoms', 'day_symptoms', 'pef_norm', 'relief_use']

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({'error': 'No JSON body provided'}), 400

        # Build input array in the exact order of feature_names
        input_features = [data.get(feat) for feat in feature_names]
        if None in input_features:
            return jsonify({'error': f'Missing features. Required: {feature_names}'}), 400

        input_array = np.array([input_features])
        input_scaled = scaler.transform(input_array)
        proba = model.predict_proba(input_scaled)[0]
        risk_score = float(proba[1])   # assuming class 1 is "high risk"

        # Determine risk level (GINA thresholds)
        if risk_score < 0.35:
            risk_level = "low"
        elif risk_score < 0.60:
            risk_level = "medium"
        elif risk_score < 0.85:
            risk_level = "high"
        else:
            risk_level = "critical"

        return jsonify({
            'riskScore': risk_score,
            'riskLevel': risk_level,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)   # debug=False for production