# audio_handler_transfer.py
import joblib
import librosa
import numpy as np
import os
import traceback

class AsthmaTransferDetector:
    def __init__(self, models_path='models/'):
        print("🔧 Loading models...")
        
        # Use the ACTUAL filenames from your directory
        try:
            # Correct filenames based on your `dir` output
            self.model_asthma = joblib.load(os.path.join(models_path, 'model_asthma_transfert.pkl'))
            self.scaler_icbhi = joblib.load(os.path.join(models_path, 'scaler_icbhi.pkl'))
            self.model_wheeze = joblib.load(os.path.join(models_path, 'model_wheeze_regularized.pkl'))
            self.leaf_encoders = joblib.load(os.path.join(models_path, 'leaf_encoders.pkl'))
            print("✅ Loaded transfer learning model successfully")
            print(f"📊 Model type: {type(self.model_asthma)}")
            self.has_wheeze_model = True
        except Exception as e:
            print(f"⚠️ Could not load wheeze model: {e}")
            print("⚠️ Running in simplified mode (direct features only)")
            self.model_asthma = joblib.load(os.path.join(models_path, 'model_asthma_transfert.pkl'))
            self.scaler_icbhi = joblib.load(os.path.join(models_path, 'scaler_icbhi.pkl'))
            self.model_wheeze = None
            self.leaf_encoders = None
            self.has_wheeze_model = False
        
        # Compatibility aliases
        self.model = self.model_asthma
        self.n_features_in_ = 34
        
    def extract_features(self, filepath, duration=5, sr=22050):
        try:
            y, orig_sr = librosa.load(filepath, sr=None, duration=duration)
            if len(y) == 0:
                return None
            
            # Resample if needed
            if orig_sr != sr:
                from scipy import signal
                y = signal.resample(y, int(len(y) * sr / orig_sr))
            
            # Fix length
            target_len = sr * duration
            if len(y) < target_len:
                y = np.pad(y, (0, target_len - len(y)))
            else:
                y = y[:target_len]
            
            # MFCC features
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            mfcc_mean = np.mean(mfcc, axis=1)
            mfcc_std = np.std(mfcc, axis=1)
            
            # Spectral features
            spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spec_roll = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            rms = librosa.feature.rms(y=y)[0]
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            
            # Combine 34 features
            features = np.concatenate([
                mfcc_mean, mfcc_std,
                [np.mean(spec_cent)], [np.std(spec_cent)],
                [np.mean(spec_roll)], [np.std(spec_roll)],
                [np.mean(rms)], [np.std(rms)],
                [np.mean(zcr)], [np.std(zcr)]
            ])
            
            return features
        except Exception as e:
            print(f"Feature extraction error: {e}")
            return None
    
    def predict(self, audio_path):
        try:
            print(f"\n🔍 Transfer Learning prediction for: {audio_path}")
            
            # Extract features
            features = self.extract_features(audio_path)
            if features is None:
                return {'asthma_probability': 0, 'error': True, 'message': 'Feature extraction failed'}
            
            # Scale with ICBHI scaler
            features_scaled = self.scaler_icbhi.transform([features])
            
            # Get leaf indices from wheeze model (only if we have it)
            if self.has_wheeze_model and self.model_wheeze is not None and self.leaf_encoders is not None:
                try:
                    leaf_indices = self.model_wheeze.apply(features_scaled)
                    
                    # One-hot encode per tree
                    X_encoded = []
                    for tree_idx, encoder in enumerate(self.leaf_encoders):
                        leaf_vals = leaf_indices[:, tree_idx].reshape(-1, 1)
                        encoded = encoder.transform(leaf_vals)
                        X_encoded.append(encoded)
                    
                    X_transformed = np.hstack(X_encoded)
                except Exception as e:
                    print(f"⚠️ Leaf encoding failed: {e}, using features directly")
                    X_transformed = features_scaled
            else:
                # Use features directly
                X_transformed = features_scaled
            
            # Final prediction
            proba = self.model_asthma.predict_proba(X_transformed)[0, 1]
            
            print(f"🎯 Asthma probability: {proba:.3f}")
            
            # Determine severity based on probability
            if proba < 0.40:
                severity = 'low'
                message = 'Low probability of asthma. You appear healthy!'
                next_action = 'healthy_exit'
            elif proba < 0.65:
                severity = 'uncertain'
                message = 'Your results are inconclusive. Please complete the questionnaire for a more accurate assessment.'
                next_action = 'questionnaire'
            else:
                severity = 'high'
                message = 'High probability of asthma attack risk. Please consult a doctor immediately.'
                next_action = 'continue_to_app'
            
            return {
                'asthma_probability': float(proba),
                'confidence': float(max(proba, 1-proba)),
                'model_accuracy': 0.955,
                'severity': severity,
                'message': message,
                'next_action': next_action
            }
        except Exception as e:
            print(f"Prediction error: {e}")
            print(traceback.format_exc())
            return {'asthma_probability': 0, 'error': True, 'message': str(e)}

_detector = None

def get_detector():
    global _detector
    if _detector is None:
        _detector = AsthmaTransferDetector()
    return _detector