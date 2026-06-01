# OceanCast — AI Fish Predictor

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. (Optional) Replace ocean.csv with your own dataset
#    Required columns: chlorophyll, sst, ssh, salinity, month, location, fish_species

# 3. Run Flask
python app.py
```

Open http://localhost:5000

## Using Your Own Trained Model

If you already have a trained model, save it as:

```python
import joblib
joblib.dump({
    "model": your_rf_model,
    "le_fish": your_label_encoder_for_fish,
    "le_loc": your_label_encoder_for_location
}, "model.pkl")
```

Place `model.pkl` in the project root. The app loads it automatically on startup.

## API

**POST** `/predict`

```json
{
  "chlorophyll": 0.45,
  "sst": 28.5,
  "ssh": 0.12,
  "salinity": 34.2,
  "month": 6,
  "location": "1"
}
```

Response:
```json
{
  "predictions": [
    { "fish": "Yellowfin Tuna", "confidence": 72.3 },
    { "fish": "Wahoo", "confidence": 15.1 },
    ...
  ]
}
```

## Folder Structure

```
project/
├── app.py
├── model.pkl          (auto-generated or bring your own)
├── ocean.csv          (training data)
├── requirements.txt
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```
