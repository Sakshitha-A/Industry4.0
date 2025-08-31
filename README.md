# Industry4.0
This project presents a 3D digital twin of an industrial chopper bowl cutter, a crucial piece of food processing equipment. The digital twin serves as a virtual replica, offering real-time monitoring, predictive maintenance, and operational insights without the need for physical interaction.

An industrial chopper bowl cutter is a heavy-duty food processing machine used in large-scale food production. It efficiently chops, mixes, grinds, and emulsifies various ingredients, such as meat and vegetables, into uniform textures. The machine operates with a powerful motor that spins a set of razor-sharp blades at high speeds inside a rotating stainless-steel bowl. The core function relies on these two components, which are often subject to wear and tear due to high-speed operation and continuous use.

## Features
This 3D digital twin offers an integrated solution for monitoring, analyzing, and predicting the health of the industrial chopper bowl cutter, with a focus on its critical motor and blade components. It combines an interactive virtual model with advanced data-driven analytics and inventory management.

### 📊 Data Analysis & Preprocessing
The twin uses time-series data from sensors to understand the equipment's behavior. The process involves:

Data Cleaning: Handling missing data points and smoothing out noisy signals from sources like vibration or current sensors.

Resampling and Aggregation: Normalizing data recorded at different time intervals to a consistent frequency.

Feature Extraction: Deriving meaningful features from the raw data. This includes statistical metrics (e.g., mean, standard deviation, root mean square of vibration), frequency domain features (using Fourier Transforms to detect specific vibration frequencies related to imbalances), and temporal features (rolling averages, trends). These features are crucial for identifying patterns that indicate component degradation.

### 🤖 Machine Learning for Predictive Maintenance
The preprocessed data is fed into machine learning and deep learning models to predict potential failures and estimate the Remaining Useful Life (RUL).

Prediction Models: The system employs models like Random Forest for its ability to handle complex, non-linear relationships and identify key features contributing to failure. For sequence-dependent data, Long Short-Term Memory (LSTM) networks and Transformers are used to capture temporal patterns and long-term dependencies in sensor readings, which are essential for accurately forecasting degradation over time.

RUL Estimation: By training on historical run-to-failure data, these models learn to correlate sensor readings with the equipment's health state, providing an accurate estimate of its RUL. This allows for scheduled maintenance, preventing unexpected downtime and optimizing operational costs.

### 📦 Inventory Management
Beyond predictive analytics, the digital twin includes a smart inventory management system. It integrates the predicted RUL with the availability of critical spare parts, such as new motors or blades. When a component's RUL falls below a certain threshold, the system can automatically trigger a notification to procure a replacement part, ensuring that a new component is available before a failure occurs. This proactive approach minimizes maintenance lead times and maximizes operational efficiency.
