import pandas as pd
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, OrdinalEncoder

# Load the data
data = pd.read_csv('loan_remediation_data.csv')

# Separate categorical and numerical features
categorical_features = ['gender', 'loan_type', 'employment_status', 'marital_status', 'remediation_strategy']
numerical_features = ['customer_id', 'age', 'income', 'loan_amount', 'interest_rate', 'loan_term', 'loan_interest_rate', 'credit_score', 'missed_payments', 'missed_payments_duration', 'successful', 'timestamp']

# Encode the target variable
label_encoder = LabelEncoder()
data['successful'] = label_encoder.fit_transform(data['successful'])

# One-hot encode 'gender' and 'loan_type'
one_hot_encoder = OneHotEncoder(handle_unknown='ignore')
data_one_hot = one_hot_encoder.fit_transform(data[['gender', 'loan_type']]).toarray()
categorical_one_hot = pd.DataFrame(data_one_hot, columns=one_hot_encoder.get_feature_names_out(['gender', 'loan_type']))

# Label encode 'marital_status'
label_encoder = LabelEncoder()
data['marital_status'] = label_encoder.fit_transform(data['marital_status'])

# Ordinal encode 'employment_status' and 'remediation_strategy'
ordinal_encoder = OrdinalEncoder()
data_ordinal = ordinal_encoder.fit_transform(data[['employment_status', 'remediation_strategy']])
categorical_ordinal = pd.DataFrame(data_ordinal, columns=['employment_status', 'remediation_strategy'])

# Combine categorical, numerical, and target features
data_transformed = pd.concat([data[numerical_features], categorical_one_hot, categorical_ordinal], axis=1)

# Save the transformed data
data_transformed.to_csv('loan_remediation_data_transformed.csv', index=False)