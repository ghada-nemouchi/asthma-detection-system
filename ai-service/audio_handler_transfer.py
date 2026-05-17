# audio_handler_transfer.py - COMPLETE FIXED VERSION
import joblib
import librosa
import numpy as np
import os
import traceback

# ============================================================================
# Safe version check (works with librosa 0.9.2)
# ============================================================================
try:
    if hasattr(librosa, '__version__'):
        librosa_version = librosa.__version__
    else:
        import pkg_resources
        librosa_version = pkg_resources.get_distribution("librosa").version
    
    if librosa_version != '0.9.2':
        print(f"⚠️ WARNING: Librosa {librosa_version} (expected 0.9.2)")
except:
    print(f"⚠️ Could not verify librosa version")

# ============================================================================
# ASTHMA TRANSFER DETECTOR
# ============================================================================

class AsthmaTransferDetector:
    def __init__(self, models_path='models/'):
        print("\n" + "="*70)
        print("🔧 LOADING ASTHMA DETECTION MODELS")
        print("="*70)
        
        self.models_path = models_path
        self.model_asthma = None
        self.model_wheeze = None
        self.scaler_icbhi = None
        self.leaf_encoders = None
        
        self._load_models()
        self._validate_models()
        
        self.model = self.model_asthma
        self.n_features_in_ = 34
        
        print("✅ All models loaded!")
        print("="*70 + "\n")
    
    def _load_models(self):
        """Load all required model files"""
        
        # Load wheeze model
        try:
            print("\n📦 Loading wheeze detection model...")
            wheeze_path = os.path.join(self.models_path, 'model_wheeze.pkl')
            if not os.path.exists(wheeze_path):
                wheeze_path = os.path.join(self.models_path, 'model_wheeze_regularized.pkl')
            
            self.model_wheeze = joblib.load(wheeze_path)
            print(f"   ✅ Loaded: {type(self.model_wheeze).__name__}")
        except Exception as e:
            print(f"   ❌ FATAL: Cannot load wheeze model: {e}")
            raise
        
        # Load asthma model
        try:
            print("\n📦 Loading asthma classifier...")
            asthma_path = os.path.join(self.models_path, 'model_asthma_transfert.pkl')
            self.model_asthma = joblib.load(asthma_path)
            print(f"   ✅ Loaded: {type(self.model_asthma).__name__}")
        except Exception as e:
            print(f"   ❌ FATAL: Cannot load asthma model: {e}")
            raise
        
        # Load scaler
        try:
            print("\n📦 Loading ICBHI scaler...")
            self.scaler_icbhi = joblib.load(os.path.join(self.models_path, 'scaler_icbhi.pkl'))
            print(f"   ✅ Loaded: {len(self.scaler_icbhi.mean_)} features")
        except Exception as e:
            print(f"   ❌ FATAL: Cannot load scaler: {e}")
            raise
        
        # Load leaf encoders
        try:
            print("\n📦 Loading leaf encoders...")
            self.leaf_encoders = joblib.load(os.path.join(self.models_path, 'leaf_encoders.pkl'))
            print(f"   ✅ Loaded: {len(self.leaf_encoders)} encoders")
        except Exception as e:
            print(f"   ⚠️ No leaf encoders: {e}")
            self.leaf_encoders = None
    
    def _validate_models(self):
        """Validate loaded models"""
        print("\n" + "-"*70)
        print("🔍 VALIDATING MODELS")
        print("-"*70)
        
        if self.model_wheeze is None:
            raise ValueError("Wheeze model not loaded!")
        print("✅ Wheeze model: OK")
        
        if self.model_asthma is None:
            raise ValueError("Asthma model not loaded!")
        print("✅ Asthma model: OK")
        
        if self.scaler_icbhi is None:
            raise ValueError("Scaler not loaded!")
        
        if self.scaler_icbhi.mean_.shape != (34,):
            raise ValueError(f"Scaler has wrong shape: {self.scaler_icbhi.mean_.shape} (expected (34,))")
        print("✅ Scaler: OK (34 features)")
        
        print("-"*70)
    
    def extract_features(self, filepath, duration=5, sr=22050):
        """Extract 34 audio features"""
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
            
            # Extract MFCC
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            mfcc_mean = np.mean(mfcc, axis=1)
            mfcc_std = np.std(mfcc, axis=1)
            
            # Spectral features
            spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spec_roll = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            rms = librosa.feature.rms(y=y)[0]
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            
            # Combine
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
        """Predict asthma probability"""
        try:
            # Extract features
            features = self.extract_features(audio_path)
            if features is None:
                return {'asthma_probability': 0, 'error': True, 'message': 'Feature extraction failed'}
            
            # Scale
            features_scaled = self.scaler_icbhi.transform([features])
            
            # Transform with RF if available
            if self.model_wheeze is not None and self.leaf_encoders is not None:
                leaf_indices = self.model_wheeze.apply(features_scaled)
                X_encoded = []
                for tree_idx, encoder in enumerate(self.leaf_encoders):
                    leaf_vals = leaf_indices[:, tree_idx].reshape(-1, 1)
                    encoded = encoder.transform(leaf_vals)
                    X_encoded.append(encoded)
                X_transformed = np.hstack(X_encoded)
            else:
                X_transformed = features_scaled
            
            # Predict
            proba = self.model_asthma.predict_proba(X_transformed)[0, 1]
            
            # Classify
            if proba <= 0.31:
                severity = 'low'
                message = 'Low probability of asthma. You appear healthy!'
                next_action = 'healthy_exit'
            elif proba <= 0.65:
                severity = 'uncertain'
                message = 'Your results are inconclusive. Please complete the questionnaire.'
                next_action = 'questionnaire'
            else:
                severity = 'high'
                message = 'High probability. Please consult a doctor.'
                next_action = 'continue_to_app'
            
            return {
                'asthma_probability': float(proba),
                'confidence': float(max(proba, 1-proba)),
                'severity': severity,
                'message': message,
                'next_action': next_action,
                'model_accuracy': 0.955
            }
        except Exception as e:
            print(f"Prediction error: {e}")
            traceback.print_exc()
            return {'asthma_probability': 0, 'error': True, 'message': str(e)}

_detector = None

def get_detector():
    global _detector
    if _detector is None:
        _detector = AsthmaTransferDetector()
    return _detector

if __name__ == '__main__':
    detector = get_detector()
    print("✅ Detector ready!")