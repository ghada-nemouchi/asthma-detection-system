import os
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':         'healthy',
        'model_features': feature_names,
        'model_type':     type(model).__name__,
        'n_features':     len(feature_names)
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)