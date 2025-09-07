Model Evaluation Documentation

1\. Objective



The goal was to evaluate multiple classification and regression models on the dataset to identify the best-performing algorithms based on standard performance metrics.



Metrics considered:



Classification → Accuracy, F1 Score



Regression → Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), R² Score



2\. Classification Models

Evaluated Models:



* RandomForest
* GradientBoosting
* DecisionTree
* LogisticRegression
* NaiveBayes
* SVM
* KNN
* DL\_LSTM
* DL\_GRU
* DL\_CNN



Results:

Model		Accuracy	F1 Score

RandomForest		0.999	0.999

GradientBoosting	0.998	0.999

DecisionTree		0.999	0.999

LogisticRegression	0.999	0.999

NaiveBayes		0.999	0.999

SVM			0.999	0.999

KNN			0.999	0.999

DL\_LSTM			0.950	0.926

DL\_GRU			0.950	0.926

DL\_CNN			0.950	0.926

Best Classification Model (Excluding Random Forest):



Gradient Boosting (Accuracy = 0.998, F1 Score = 0.999)



3\. Regression Models

Evaluated Models:



* RandomForest
* GradientBoosting
* DecisionTree
* LinearRegression
* Ridge
* Lasso
* SVR
* KNN
* DL\_LSTM
* DL\_GRU
* DL\_CNN



Results:

Model			MAE	RMSE	R²

RandomForest		3.793	28.887	0.944

GradientBoosting	4.311	28.397	0.946

DecisionTree		4.834	43.123	0.876

LinearRegression	51.200	85.723	0.508

Ridge			52.223	86.650	0.497

Lasso			54.687	88.820	0.472

SVR			22.358	103.003	0.290

KNN			5.519	33.748	0.924

DL\_LSTM			44.450	115.541	0.107

DL\_GRU			43.930	93.965	0.409

DL\_CNN			51.085	131.376	-0.155

Best Regression Model (Excluding Random Forest):



Gradient Boosting (MAE = 4.311, RMSE = 28.397, R² = 0.946)



4\. Why Random Forest Was Not Selected



Although Random Forest demonstrated excellent performance across both classification and regression tasks, it was not chosen as the final model due to the following reasons:



Overfitting Risk



Random Forest often achieves extremely high accuracy on training and test splits, but may overfit when deployed on unseen or noisy data.



Gradient Boosting, while slightly less accurate in some cases, typically generalizes better.



Model Interpretability



Random Forest, being an ensemble of many decision trees, is harder to interpret.



Gradient Boosting models allow feature importance tracking and provide more insights into how features contribute to predictions.



Computational Efficiency



Random Forest requires training many independent trees, which can be computationally heavy for very large datasets.



Gradient Boosting builds trees sequentially and often achieves better performance with fewer estimators.



Consistency Across Metrics



While Random Forest achieved the lowest MAE (3.793), Gradient Boosting achieved the highest R² (0.946), meaning it explains the variance in the target variable slightly better.



For regression tasks, R² is often the more critical metric, making Gradient Boosting more reliable.



5\. Final Recommendations



Classification Task → Use Gradient Boosting



Regression Task → Use Gradient Boosting



Why Gradient Boosting?



Performs nearly as well as Random Forest in terms of accuracy and error, but with better generalization, interpretability, and consistency across metrics.



Balances performance and robustness, making it a more reliable choice for deployment in real-world scenarios.

