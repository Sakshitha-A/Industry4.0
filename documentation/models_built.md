# **Detailed Documentation: Gradient Boosting Models for Predictive Maintenance**

## **Overview**

This documentation covers the Gradient Boosting machine learning models implemented for predictive maintenance of motors and blades. The system includes both classification (health status prediction) and regression (Remaining Useful Life prediction) models.

## **Table of Contents**

1. [Model Architecture](#model-architecture)
2. [Gradient Boosting Algorithm](#gradient-boosting-algorithm)
3. [Classification Model](#classification-model)
4. [Regression Model](#regression-model)
5. [Hyperparameters](#hyperparameters)
6. [Preprocessing Pipeline](#preprocessing-pipeline)
7. [Training Process](#training-process)
8. [Evaluation Metrics](#evaluation-metrics)
9. [Model Files](#model-files)
10. [Usage Examples](#usage-examples)

---

## **Model Architecture**

### **System Components**
```
├── GradientBoostingClassifier (Health Status Prediction)
├── GradientBoostingRegressor (RUL Prediction)
├── StandardScaler (Feature Normalization)
└── LabelEncoder (Label Transformation)
```

### **Input Features**

**Motor Dataset Features:**
- `PhaseA_Current`, `PhaseB_Current`, `PhaseC_Current`: Electrical current measurements (Amps)
- `Power_Consumption`: Energy usage (Watts)
- `Power_Factor`: Efficiency ratio (0-1)
- `Vibration`: Mechanical vibration levels (mm/s)
- `Temp`: Temperature readings (°C)
- `Speed`: Rotational speed (RPM)

**Blade Dataset Features:**
- `Vibration`: Vibration intensity
- `Torque`: Rotational force (Nm)
- `Speed`: Rotational speed (RPM)
- `Noise`: Acoustic emissions (dB)
- `Temp`: Temperature readings (°C)

---

## **Gradient Boosting Algorithm**

### **Core Concept**
Gradient Boosting is an ensemble learning method that builds multiple weak learners (decision trees) sequentially, where each new tree corrects the errors of the previous ensemble.

### **Mathematical Foundation**

**Algorithm Steps:**
1. Initialize model with constant value:
   ```
   F₀(x) = argmin_γ Σ L(y_i, γ)
   ```
2. For m = 1 to M (number of trees):
   ```
   Compute pseudo-residuals: r_im = -[∂L(y_i, F(x_i))/∂F(x_i)] for i=1,...,n
   Fit a tree h_m(x) to the residuals
   Compute multiplier: γ_m = argmin_γ Σ L(y_i, F_{m-1}(x_i) + γh_m(x_i))
   Update model: F_m(x) = F_{m-1}(x) + ν·γ_mh_m(x)
   ```
3. Final prediction: `F_M(x)`

Where:
- `L`: Loss function
- `ν`: Learning rate
- `γ_m`: Optimal step size

---

## **Classification Model**

### **GradientBoostingClassifier**

**Purpose**: Predict equipment health status categories

**Target Labels:**
- Motor: `["Healthy", "Warning", "Critical"]` → Encoded as `[0, 1, 2]`
- Blade: `["Good", "Needs Maintenance", "Critical"]` → Encoded as `[0, 1, 2]`

**Loss Function**: Deviance (equivalent to logistic regression loss for binary classification, extended for multiclass)

**Output**: Probability distribution over classes

### **Training Process**
```python
# Model initialization
gb_cls = GradientBoostingClassifier(
    n_estimators=200,      # Number of trees
    learning_rate=0.1,     # Shrinkage factor
    max_depth=3,           # Tree depth
    random_state=42        # Reproducibility
)

# Training
gb_cls.fit(X_train_scaled, y_train_encoded)
```

---

## **Regression Model**

### **GradientBoostingRegressor**

**Purpose**: Predict Remaining Useful Life (RUL) in operational hours/cycles

**Target**: Continuous numerical value representing remaining life

**Loss Function**: Least squares (L2 loss)

**Output**: Continuous RUL prediction

### **Training Process**
```python
# Model initialization
gb_reg = GradientBoostingRegressor(
    n_estimators=200,      # Number of trees
    learning_rate=0.1,     # Shrinkage factor
    max_depth=3,           # Tree depth
    random_state=42,       # Reproducibility
    loss='squared_error'   # L2 loss function
)

# Training
gb_reg.fit(X_train_scaled, y_rul_train)
```

---

## **Hyperparameters**

### **Core Parameters**
| Parameter | Value | Description |
|-----------|-------|-------------|
| `n_estimators` | 200 | Number of boosting stages (trees) |
| `learning_rate` | 0.1 | Shrinkage factor to prevent overfitting |
| `max_depth` | 3 | Maximum depth of individual trees |
| `random_state` | 42 | Seed for reproducible results |
| `subsample` | 1.0 | Fraction of samples used for fitting |
| `min_samples_split` | 2 | Minimum samples required to split node |
| `min_samples_leaf` | 1 | Minimum samples required at leaf node |

### **Parameter Rationale**
- **200 trees**: Balances performance and computational efficiency
- **Learning rate 0.1**: Provides good convergence with reasonable training time
- **Max depth 3**: Prevents overfitting while capturing complex patterns
- **Random state 42**: Ensures reproducible results across runs

---

## **Preprocessing Pipeline**

### **StandardScaler**
**Purpose**: Normalize features to mean=0, standard deviation=1

**Transformation**: `z = (x - μ) / σ`

**Why needed**: Gradient Boosting is scale-invariant but scaling improves numerical stability and convergence

### **LabelEncoder**
**Purpose**: Convert categorical labels to numerical values

**Transformation**: 
- `["Healthy", "Warning", "Critical"]` → `[0, 1, 2]`
- Inverse transformation available for predictions

---

## **Training Process**

### **Data Flow**
1. **Data Loading**: Load CSV datasets
2. **Feature Extraction**: Select relevant columns
3. **Label Encoding**: Convert string labels to numerical
4. **Train-Test Split**: Alternate row splitting (50-50%)
5. **Feature Scaling**: Standardize features
6. **Model Training**: Fit Gradient Boosting models
7. **Evaluation**: Calculate performance metrics
8. **Model Saving**: Serialize models and preprocessing objects

### **Training Time Complexity**
- **Time**: O(M × N × D × log N)
- **Space**: O(M × D × max_depth)

Where:
- M: number of trees (200)
- N: number of samples
- D: number of features

---

## **Evaluation Metrics**

### **Classification Metrics**
| Metric | Formula | Purpose |
|--------|---------|---------|
| **Accuracy** | `(TP + TN) / Total` | Overall correctness |
| **F1 Score** | `2 × (Precision × Recall) / (Precision + Recall)` | Harmonic mean of precision/recall |

### **Regression Metrics**
| Metric | Formula | Purpose |
|--------|---------|---------|
| **MAE** | `Σ|y_true - y_pred| / n` | Average absolute error |
| **RMSE** | `√(Σ(y_true - y_pred)² / n)` | Root mean squared error |
| **R² Score** | `1 - (Σ(y_true - y_pred)² / Σ(y_true - y_mean)²)` | Explained variance |

---

## **Model Files**

### **Saved Files Structure**
```
saved_models/
├── motor_gradient_boosting_classifier.pkl
├── motor_gradient_boosting_regressor.pkl
├── motor_scaler.pkl
├── motor_label_encoder.pkl
├── blade_gradient_boosting_classifier.pkl
├── blade_gradient_boosting_regressor.pkl
├── blade_scaler.pkl
└── blade_label_encoder.pkl
```

### **File Descriptions**
- **`.pkl` files**: Python pickle format for serialization
- **Classifier**: Health status prediction model
- **Regressor**: RUL prediction model
- **Scaler**: Feature normalization parameters
- **LabelEncoder**: Label mapping dictionary


## **Performance Characteristics**

### **Expected Performance**
- **Classification Accuracy**: 85-95% on test data
- **Regression R² Score**: 0.8-0.95 on test data
- **Training Time**: 10-60 seconds (depending on dataset size)
- **Prediction Time**: < 1ms per sample

### **Limitations**
- Requires consistent feature scaling during prediction
- Sensitive to hyperparameter tuning
- May overfit with small datasets
- Black-box nature (consider SHAP/LIME for interpretability)

### **Best Practices**
1. Always use the same scaler for training and prediction
2. Monitor feature distributions for drift over time
3. Retrain models periodically with new data
4. Validate predictions with domain expertise

This documentation provides comprehensive information about the Gradient Boosting models implemented for predictive maintenance. The models are designed for reliability, performance, and ease of deployment in industrial applications.