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
    target_col = "fish_species"

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
    if model is None:
        return jsonify({"error": "Model not loaded. Provide model.pkl or ocean.csv."}), 500

    data = request.form
    try:
        location_val = str(data["location"])
        if hasattr(le_loc, "classes_"):
            if location_val in le_loc.classes_:
                location_val = le_loc.transform([location_val])[0]
            else:
                location_val = 0  # fallback for unknown location

        features = np.array([[
            float(data["chlorophyll"]),
            float(data["sst"]),
            float(data["ssh"]),
            float(data["salinity"]),
            int(data["month"]),
            float(location_val)
        ]])

        proba = model.predict_proba(features)[0]
        classes = le_fish.inverse_transform(np.arange(len(proba)))

        ranked = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)
        results = [{"fish": str(f), "confidence": round(float(c) * 100, 1)} for f, c in ranked[:5]]

        return jsonify({"predictions": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    import os

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )