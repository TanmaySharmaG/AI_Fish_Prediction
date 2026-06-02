from flask import Flask, request, jsonify, render_template
import joblib, numpy as np, os, pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

app = Flask(__name__)
MODEL_PATH = "model.pkl"

def train_and_save_model():
    """Train model from ocean.csv if model.pkl doesn't exist."""
    df = pd.read_csv("ocean.csv")
    feature_cols = ["chlorophyll", "sst", "ssh", "salinity", "month", "location"]
    target_col = "fish_name"

    # Always encode location (handles both string and numeric)
    le_loc = LabelEncoder()
    df["location"] = le_loc.fit_transform(df["location"].astype(str))

    le_fish = LabelEncoder()
    df[target_col] = le_fish.fit_transform(df[target_col])

    X = df[feature_cols].values
    y = df[target_col].values

    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X, y)

    joblib.dump({"model": model, "le_fish": le_fish, "le_loc": le_loc}, MODEL_PATH)
    print("Model trained and saved.")
    return model, le_fish, le_loc

def load_model():
    data = joblib.load(MODEL_PATH)
    return data["model"], data["le_fish"], data["le_loc"]

# Load or train model at startup
if not os.path.exists(MODEL_PATH):
    if os.path.exists("ocean.csv"):
        model, le_fish, le_loc = train_and_save_model()
    else:
        model, le_fish, le_loc = None, None, None
        print("Warning: No model.pkl or ocean.csv found.")
else:
    model, le_fish, le_loc = load_model()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    chlorophyll = float(data["chlorophyll"])
    sst = float(data["sst"])
    ssh = float(data["ssh"])
    salinity = float(data["salinity"])
    month = int(data["month"])
    location = data["location"]

    # Encode location
    location_encoded = le_loc.transform([location])[0]

    features = [[
        chlorophyll,
        sst,
        ssh,
        salinity,
        month,
        location_encoded
    ]]

    # Predict probabilities
    probs = model.predict_proba(features)[0]

    # Top 5 predictions
    top_indices = probs.argsort()[-5:][::-1]

    predictions = []

    for idx in top_indices:
        fish_name = le_fish.inverse_transform([idx])[0]
        confidence = round(probs[idx] * 100, 2)

        predictions.append({
            "fish": fish_name,
            "confidence": confidence
        })

    return jsonify({
        "predictions": predictions
    })
if __name__ == "__main__":
    import os

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )