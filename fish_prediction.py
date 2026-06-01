# ================================
# AI FISH PREDICTION SYSTEM
# ================================

# Import libraries
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    confusion_matrix,
    accuracy_score,
    classification_report
)

from sklearn.preprocessing import LabelEncoder

import seaborn as sns
import matplotlib.pyplot as plt

import warnings
warnings.filterwarnings("ignore")

# ================================
# LOAD DATASET
# ================================

df = pd.read_csv("ocean.csv")

print("Dataset Loaded Successfully!\n")

print(df.head())

# ================================
# ENCODE CATEGORICAL COLUMNS
# ================================

label_encoders = {}

# Encode fish_name
fish_encoder = LabelEncoder()
df["fish_name"] = fish_encoder.fit_transform(df["fish_name"])
label_encoders["fish_name"] = fish_encoder

# Encode location
location_encoder = LabelEncoder()
df["location"] = location_encoder.fit_transform(df["location"])
label_encoders["location"] = location_encoder

# ================================
# FEATURES AND TARGET
# ================================

X = df[[
    "chlorophyll",
    "sst",
    "ssh",
    "salinity",
    "month",
    "location"
]]

y = df["fish_name"]

# ================================
# TRAIN TEST SPLIT
# ================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# ================================
# TRAIN MODEL
# ================================

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

print("\nModel Trained Successfully!")

# ================================
# MODEL EVALUATION
# ================================

y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print("\nAccuracy:", accuracy)

print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))

# ================================
# CONFUSION MATRIX
# ================================

cm = confusion_matrix(y_test, y_pred)

plt.figure(figsize=(8,6))

sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues'
)

plt.title("Confusion Matrix")
plt.xlabel("Predicted")
plt.ylabel("Actual")

plt.savefig("confusion_matrix.png")
print("Confusion matrix saved!")

# ================================
# FISH PREDICTION FUNCTION
# ================================

def predict_fish(
    chlorophyll,
    sst,
    ssh,
    salinity,
    month,
    location
):

    # Encode location
    location_encoded = label_encoders["location"].transform(
        [location]
    )[0]

    # Create dataframe
    input_data = pd.DataFrame([[
        chlorophyll,
        sst,
        ssh,
        salinity,
        month,
        location_encoded
    ]], columns=X.columns)

    # Predict probabilities
    probs = model.predict_proba(input_data)[0]

    # Decode fish names
    fish_labels = label_encoders["fish_name"].inverse_transform(
        range(len(probs))
    )

    # Combine and sort
    result = sorted(
        zip(fish_labels, probs),
        key=lambda x: x[1],
        reverse=True
    )

    return result

# ================================
# LIVE USER INPUT TESTING
# ================================

print("\nEnter Ocean Parameters\n")

chlorophyll = float(input("Enter chlorophyll: "))
sst = float(input("Enter SST: "))
ssh = float(input("Enter SSH: "))
salinity = float(input("Enter salinity: "))
month = int(input("Enter month (1-12): "))
location = input("Enter location: ")

# Predict fish
result = predict_fish(
    chlorophyll,
    sst,
    ssh,
    salinity,
    month,
    location
)

# Display results
print("\n==============================")
print("PREDICTED FISH RANKING")
print("==============================\n")

for fish, prob in result:
    print(f"{fish} : {prob:.4f}")

# Top fish
top_fish = result[0]

print("\n==============================")
print("MOST LIKELY FISH")
print("==============================")

print(f"Fish Name : {top_fish[0]}")
print(f"Confidence : {top_fish[1]*100:.2f}%")