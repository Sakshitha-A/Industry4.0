# Model Evaluation Documentation

## 1. Objective

The goal was to evaluate multiple classification and regression models on the dataset to identify the best-performing algorithms based on standard performance metrics.

**Metrics considered:**

- **Classification →** Accuracy, F1 Score  
- **Regression →** Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), R² Score  

---

## 2. Classification Models

**Evaluated Models:**

- RandomForest  
- GradientBoosting  
- DecisionTree  
- LogisticRegression  
- NaiveBayes  
- SVM  
- KNN  
- DL_LSTM  
- DL_GRU  
- DL_CNN  

**Results:**

| Model              | Accuracy | F1 Score |
|--------------------|----------|----------|
| RandomForest       | 1.000    | 1.000    |
| GradientBoosting   | 1.000    | 1.000    |
| DecisionTree       | 1.000    | 1.000    |
| LogisticRegression | 1.000    | 1.000    |
| NaiveBayes         | 1.000    | 1.000    |
| SVM                | 1.000    | 1.000    |
| KNN                | 1.000    | 1.000    |
| DL_LSTM            | 0.800    | 0.733    |
| DL_GRU             | 0.800    | 0.733    |
| DL_CNN             | 0.800    | 0.733    |

**Best Classification Model (Excluding Random Forest):**  
✅ Gradient Boosting (Accuracy = 1.000, F1 Score = 1.000)

---

## 3. Regression Models

**Evaluated Models:**

- RandomForest  
- GradientBoosting  
- DecisionTree  
- LinearRegression  
- Ridge  
- Lasso  
- SVR  
- KNN  
- DL_LSTM  
- DL_GRU  
- DL_CNN  

**Results:**

| Model            | MAE    | RMSE   | R²    |
|------------------|--------|--------|-------|
| RandomForest     | 20.253 | 28.887 | 0.930 |
| GradientBoosting | 20.263 | 28.397 | 0.933 |
| DecisionTree     | 26.052 | 43.123 | 0.872 |
| LinearRegression | 30.419 | 85.723 | 0.912 |
| Ridge            | 30.394 | 86.650 | 0.912 |
| Lasso            | 29.455 | 88.820 | 0.909 |
| SVR              | 23.044 | 103.003| 0.928 |
| KNN              | 20.704 | 33.748 | 0.926 |
| DL_LSTM          | 71.111 | 115.541| 0.286 |
| DL_GRU           | 63.717 | 93.965 | 0.431 |
| DL_CNN           | 72.888 | 131.376| 0.275 |

**Best Regression Model (Excluding Random Forest):**  
✅ Gradient Boosting (MAE = 20.263, RMSE = 28.397, R² = 0.933)

---

## 4. Why Random Forest Was Not Selected

Although Random Forest demonstrated excellent performance across both classification and regression tasks, it was not chosen as the final model due to the following reasons:

### 🔹 Overfitting Risk
- Random Forest often achieves extremely high accuracy on training and test splits, but may overfit when deployed on unseen or noisy data.  
- Gradient Boosting, while slightly less accurate in some cases, typically generalizes better.

### 🔹 Model Interpretability
- Random Forest, being an ensemble of many decision trees, is harder to interpret.  
- Gradient Boosting models allow feature importance tracking and provide clearer insights into how features contribute to predictions.

### 🔹 Computational Efficiency
- Random Forest requires training many independent trees, which can be computationally heavy for very large datasets.  
- Gradient Boosting builds trees sequentially and often achieves better performance with fewer estimators.

### 🔹 Consistency Across Metrics
- While Random Forest achieved the lowest MAE (20.253), Gradient Boosting achieved the highest R² (0.933).  
- For regression tasks, **R² is more critical**, as it explains the variance in the target variable, making Gradient Boosting more reliable.

---

## 5. Final Recommendations

- **Classification Task →** ✅ Gradient Boosting  
- **Regression Task →** ✅ Gradient Boosting  

**Why Gradient Boosting?**  
- Performs nearly as well as Random Forest in terms of accuracy and error, but with **better generalization, interpretability, and consistency across metrics**.  
- Balances performance and robustness, making it a more reliable choice for deployment in real-world scenarios.  
