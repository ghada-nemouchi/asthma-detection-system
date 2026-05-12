# ai-service/audio_handler.py - SUPPORTS MULTIPLE FORMATS
import joblib
import librosa
import numpy as np
import sys
import os
import traceback
import subprocess
import tempfile


# Dynamic FFmpeg path that works in your venv
if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    # We're in a virtual environment
    FFMPEG_PATH = os.path.join(sys.prefix, 'Scripts', 'ffmpeg.exe')
else:
    # Not in venv, try system paths
    FFMPEG_PATH = r"C:\Windows\System32\ffmpeg.exe"

# Also check if it exists, if not try other locations
if not os.path.exists(FFMPEG_PATH):
    # Try project tools folder
    project_ffmpeg = os.path.join(os.path.dirname(__file__), '..', 'tools', 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe')
    if os.path.exists(project_ffmpeg):
        FFMPEG_PATH = project_ffmpeg
    else:
        FFMPEG_PATH = 'ffmpeg'  # Rely on PATH
        
class AsthmaAudioDetector:
    def __init__(self, model_path='models/asthma_fast_model.pkl', 
                 scaler_path='models/scaler_fast.pkl'):
        """Load your Colab-trained Random Forest model"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_full_path = os.path.join(base_dir, model_path)
        scaler_full_path = os.path.join(base_dir, scaler_path)
        
        print(f"📂 Loading model from: {model_full_path}")
        print(f"📂 Loading scaler from: {scaler_full_path}")
        
        self.model = joblib.load(model_full_path)
        self.scaler = joblib.load(scaler_full_path)
        print(f"✅ Audio model loaded: {self.model.__class__.__name__}")
        print(f"✅ Features expected: {self.model.n_features_in_}")
        
        self.has_ffmpeg = self._check_ffmpeg()
        if self.has_ffmpeg:
            print("✅ FFmpeg available for format conversion")
        else:
            print("⚠️ FFmpeg not available - M4A support limited")
    
    def _check_ffmpeg(self):
        """Check if ffmpeg is available"""
        try:
            # First try the specific path
            if os.path.exists(FFMPEG_PATH):
                subprocess.run([FFMPEG_PATH, '-version'], 
                             capture_output=True, timeout=5)
                return True
            # Fallback to system path
            subprocess.run(['ffmpeg', '-version'], 
                         capture_output=True, timeout=5)
            return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def _convert_to_wav(self, input_path):
        """Convert M4A or other formats to WAV using FFmpeg"""
        if not self.has_ffmpeg:
            return None
        
        try:
            print(f"🔄 Converting to WAV format...")
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                output_path = tmp.name
            
            # Use the full path to ffmpeg
            ffmpeg_cmd = FFMPEG_PATH if os.path.exists(FFMPEG_PATH) else 'ffmpeg'
            
            cmd = [
                ffmpeg_cmd,
                '-i', input_path,
                '-acodec', 'pcm_s16le',
                '-ar', '22050',
                '-ac', '1',
                '-y',
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, timeout=30)
            
            if result.returncode == 0 and os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"✅ Conversion successful: {file_size} bytes")
                return output_path
            else:
                error_msg = result.stderr.decode()[:200] if result.stderr else "Unknown error"
                print(f"❌ FFmpeg conversion failed: {error_msg}")
                if os.path.exists(output_path):
                    os.unlink(output_path)
                return None
                
        except Exception as e:
            print(f"❌ Conversion error: {str(e)}")
            return None
    def extract_features(self, audio_path, sr=22050, duration=10):
        """Extract features from audio file"""
        try:
            print(f"🎵 Processing audio file: {audio_path}")
            
            # Get file extension
            _, ext = os.path.splitext(audio_path)
            print(f"📄 File format: {ext}")
            
            # Try direct librosa load first
            try:
                print(f"🔄 Attempting direct librosa load...")
                y, sr_loaded = librosa.load(audio_path, sr=sr, duration=duration, res_type='kaiser_fast')
                print(f"✅ Direct load successful: {len(y)} samples")
            except Exception as e:
                print(f"⚠️ Direct load failed: {str(e)}")
                
                # Try FFmpeg conversion if direct load fails
                if ext.lower() in ['.m4a', '.aac', '.mp3']:
                    print(f"🔄 File is {ext} format, attempting FFmpeg conversion...")
                    wav_path = self._convert_to_wav(audio_path)
                    
                    if wav_path:
                        try:
                            y, sr_loaded = librosa.load(wav_path, sr=sr, duration=duration, res_type='kaiser_fast')
                            os.unlink(wav_path)  # Clean up temp file
                            print(f"✅ Conversion + load successful: {len(y)} samples")
                        except Exception as e2:
                            print(f"❌ Failed to load converted file: {str(e2)}")
                            if os.path.exists(wav_path):
                                os.unlink(wav_path)
                            raise
                    else:
                        raise Exception("FFmpeg conversion failed")
                else:
                    raise
            
            print(f"✅ Audio loaded: {len(y)} samples at {sr_loaded} Hz")
            
            # Validate audio
            if len(y) == 0:
                print("❌ Audio file is empty")
                return None
            
            # Check audio duration
            audio_duration = len(y) / sr_loaded
            print(f"⏱️ Audio duration: {audio_duration:.2f} seconds")
            
            if audio_duration < 1:
                print("⚠️ WARNING: Audio is very short (< 1 second)")
            
            # Pad or trim to fixed length
            target_length = sr_loaded * duration
            if len(y) < target_length:
                y = np.pad(y, (0, target_length - len(y)))
                print(f"📏 Padded audio to {target_length} samples")
            else:
                y = y[:target_length]
                print(f"📏 Trimmed audio to {target_length} samples")
            
            # Extract MFCC features
            mfcc = librosa.feature.mfcc(y=y, sr=sr_loaded, n_mfcc=13)
            mfcc_mean = np.mean(mfcc, axis=1)
            mfcc_std = np.std(mfcc, axis=1)
            
            # Extract spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr_loaded)[0]
            rms = librosa.feature.rms(y=y)[0]
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            
            # Combine features
            features = np.concatenate([
                mfcc_mean,
                mfcc_std,
                [np.mean(spectral_centroids)],
                [np.std(spectral_centroids)],
                [np.mean(rms)],
                [np.mean(zcr)]
            ])
            
            print(f"📊 Extracted {len(features)} features")
            
            # Handle feature count mismatch
            if len(features) != self.model.n_features_in_:
                print(f"⚠️ Feature count mismatch: expected {self.model.n_features_in_}, got {len(features)}")
                if len(features) < self.model.n_features_in_:
                    features = np.pad(features, (0, self.model.n_features_in_ - len(features)))
                else:
                    features = features[:self.model.n_features_in_]
                print(f"✅ Adjusted to {len(features)} features")
            
            return features
            
        except Exception as e:
            print(f"❌ Feature extraction error: {str(e)}")
            print(traceback.format_exc())
            return None
    
    def predict(self, audio_path):
        """Predict asthma probability from audio"""
        try:
            print(f"\n🔍 Starting prediction for: {audio_path}")
            
            features = self.extract_features(audio_path)
            if features is None:
                print("❌ Feature extraction failed")
                return {
                    'error': 'Feature extraction failed',
                    'asthma_probability': 0,
                    'severity': 'error',
                    'confidence': 0,
                    'message': 'Could not process audio file',
                    'next_action': 'retry'
                }
            
            # Scale and predict
            features_2d = features.reshape(1, -1)
            features_scaled = self.scaler.transform(features_2d)
            proba = self.model.predict_proba(features_scaled)[0]
            asthma_probability = float(proba[1])
            
            print(f"🎯 Prediction: {asthma_probability:.3f}")
            
            # Classify severity
            if asthma_probability < 0.40:
                severity = "low"
                message = "Low probability of asthma. You appear healthy!"
                next_action = "healthy_exit"
                
            elif  asthma_probability < 0.65:
                severity = "uncertain"
                message = "Your results are inconclusive. Please complete the questionnaire for a more accurate assessment."
                next_action = "questionnaire"  # This will trigger the questionnaire
            
            else:
                severity = "high"
                message = "High probability. Please consult a doctor."
                next_action = "continue_to_app"
            
            result = {
                'asthma_probability': asthma_probability,
                'severity': severity,
                'message': message,
                'next_action': next_action,
                'confidence': float(max(proba)),
                'model_accuracy': 0.7011
            }
            
            print(f"✅ Prediction complete: {severity}")
            return result
            
        except Exception as e:
            print(f"❌ Prediction error: {str(e)}")
            print(traceback.format_exc())
            return {
                'error': str(e),
                'asthma_probability': 0,
                'severity': 'error',
                'confidence': 0,
                'message': 'Prediction failed',
                'next_action': 'retry'
            }

# Singleton
_detector = None

def get_detector():
    global _detector
    if _detector is None:
        print("🔧 Initializing AsthmaAudioDetector...")
        _detector = AsthmaAudioDetector()
    return _detector
