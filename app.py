from flask import Flask, request, jsonify, render_template
import joblib, numpy as np, os, pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

VALIDATION_RULES = {
    "chlorophyll": (0.01, 5,   "Chlorophyll must be between 0.01 and 5 mg/m³"),
    "sst":         (5,   40,   "SST must be between 5 and 40 °C"),
    "ssh":         (0,   5,    "SSH must be between 0 and 5 m"),
    "salinity":    (20,  40,   "Salinity must be between 20 and 40 PSU"),
    "month":       (1,   12,   "Month must be between 1 and 12"),
}

def validate_inputs(data):
    for field, (lo, hi, msg) in VALIDATION_RULES.items():
        try:
            val = float(data.get(field, ""))
        except (TypeError, ValueError):
            return f"{field.capitalize()} is missing or not a valid number."
        if not (lo <= val <= hi):
            return msg
    return None


app = Flask(__name__)
MODEL_PATH = "model.pkl"

def train_and_save_model():
    """Train model from ocean.csv if model.pkl doesn't exist."""
    df = pd.read_csv("ocean.csv")
    feature_cols = ["chlorophyll", "sst", "ssh", "salinity", "month", "location"]
    target_col = "fish_species"

    le_loc = LabelEncoder()
    if df["location"].dtype == object:
        df["location"] = le_loc.fit_transform(df["location"])

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


# ── Routes ──────────────────────────────────────────────────

@app.route("/")
def index():
    """Main prediction dashboard."""
    return render_template("index.html")


@app.route("/species")
def species():
    """Species Habitat Atlas page."""
    return render_template("species.html")


@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded. Provide model.pkl or ocean.csv."}), 500

    data = request.get_json()
    err = validate_inputs(data)
    if err:
        return jsonify({"error": err}), 422

    try:
        location_val = data["location"]
        if hasattr(le_loc, "classes_") and isinstance(location_val, str):
            if location_val in le_loc.classes_:
                location_val = le_loc.transform([location_val])[0]
            else:
                location_val = 0  # fallback

        features = np.array([[
            float(data["chlorophyll"]),
            float(data["sst"]),
            float(data["ssh"]),
            float(data["salinity"]),
            int(data["month"]),
            float(location_val)
        ]])

        proba   = model.predict_proba(features)[0]
        classes = le_fish.inverse_transform(np.arange(len(proba)))

        ranked  = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)
        results = [{"fish": str(f), "confidence": round(float(c) * 100, 1)} for f, c in ranked[:5]]

        return jsonify({"predictions": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 400
    @app.route("/quick_predict", methods=["POST"])
def quick_predict():
    if model is None:
        return jsonify({"error": "Model not loaded."}), 500

    data = request.get_json()
    location_str = data.get("location", "")
    try:
        month = int(data.get("month", 0))
        if not (1 <= month <= 12):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid month."}), 422

    try:
        df = pd.read_csv("ocean.csv")
    except FileNotFoundError:
        return jsonify({"error": "ocean.csv not found."}), 500

    subset = df[(df["location"] == location_str) & (df["month"] == month)]
    if subset.empty:
        return jsonify({"error": f"No records found for {location_str} in month {month}."}), 404

    est = {
        "chlorophyll": round(float(subset["chlorophyll"].median()), 4),
        "sst":         round(float(subset["sst"].median()), 2),
        "ssh":         round(float(subset["ssh"].median()), 3),
        "salinity":    round(float(subset["salinity"].median()), 2),
    }

    loc_val = location_str
    if hasattr(le_loc, "classes_") and location_str in le_loc.classes_:
        loc_val = le_loc.transform([location_str])[0]
    else:
        loc_val = 0

    features = np.array([[est["chlorophyll"], est["sst"], est["ssh"],
                          est["salinity"], month, float(loc_val)]])
    proba   = model.predict_proba(features)[0]
    classes = le_fish.inverse_transform(np.arange(len(proba)))
    ranked  = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)
    predictions = [{"fish": str(f), "confidence": round(float(c)*100, 1)} for f, c in ranked[:5]]

    return jsonify({
        "mode": "quick",
        "records_used": len(subset),
        "estimated_conditions": est,
        "predictions": predictions
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
