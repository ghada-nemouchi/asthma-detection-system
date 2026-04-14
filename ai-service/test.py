import requests
import json

print("=" * 50)
print("Testing Asthma Risk Prediction API")
print("=" * 50)

test_data = {
    "night_symptoms": 2,
    "day_symptoms": 3,
    "pef_norm": 0.7,
    "relief_use": 4
}

print("\nSending data to http://localhost:5001/predict")
print("Data:", json.dumps(test_data, indent=2))

try:
    response = requests.post('http://localhost:5001/predict', json=test_data)
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✓ Success! Response:")
        print(json.dumps(result, indent=2))
    else:
        print(f"\n✗ Error: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("\n✗ ERROR: Cannot connect to Flask server!")
    print("Make sure you have run: python app.py in a separate terminal")
except Exception as e:
    print(f"\n✗ Error: {e}")

print("\n" + "=" * 50)
