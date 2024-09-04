import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta

# Initialize Faker instance
fake = Faker()

# Define function to generate random dates
def random_date(start, end):
    delta = end - start
    int_delta = delta.days
    random_days = fake.random_int(min=0, max=int_delta)
    return start + timedelta(days=random_days)

# Define function to generate employment status
def generate_employment_status():
    status = fake.random_element(elements=('Employed', 'Self-employed', 'Unemployed'))
    return status

# Define function to generate marital status
def generate_marital_status():
    status = fake.random_element(elements=('Married', 'Single', 'Divorced'))
    return status

# Define function to generate remediation strategy
def generate_remediation_strategy():
    strategy = fake.random_element(elements=('Payment Reminder', 'Loan Restructuring', 'Debt Consolidation', 'Forbearance', 'Deferment', 'Refinancing'))
    return strategy

# Define function to generate success status
def generate_success_status():
    return np.random.choice([True, False])

# Define function to generate loan type
def generate_loan_type():
    loan_type = fake.random_element(elements=('Personal', 'Auto', 'Home', 'Student', 'Business'))
    return loan_type

# Define function to generate missed payments
def generate_missed_payments():
    missed_payments = fake.random_int(min=0, max=12)
    return missed_payments

# Define function to generate missed payments duration
def generate_missed_payments_duration(missed_payments):
    if missed_payments == 0:
        return 0
    else:
        duration = fake.random_int(min=1, max=12)
        return duration

# Define start and end dates for historical data
start_date = datetime(2018, 1, 1)
end_date = datetime(2024, 2, 28)

# Generate data
data = []
for _ in range(1000):
    customer_id = fake.unique.random_int(min=1, max=1000000)
    age = fake.random_int(min=18, max=65)
    gender = fake.random_element(elements=('Male', 'Female'))
    income = fake.random_int(min=20000, max=200000)
    loan_type = generate_loan_type()
    loan_amount = fake.random_int(min=10000, max=500000)
    interest_rate = fake.random_int(min=5, max=20) / 100
    loan_term = fake.random_int(min=12, max=60)
    loan_interest_rate = interest_rate * 100
    credit_score = fake.random_int(min=300, max=850)
    employment_status = generate_employment_status()
    marital_status = generate_marital_status()
    remediation_strategy = generate_remediation_strategy()
    missed_payments = generate_missed_payments()
    missed_payments_duration = generate_missed_payments_duration(missed_payments)
    successful = generate_success_status()
    timestamp = random_date(start_date, end_date)
    
    data.append([customer_id, age, gender, income, loan_type, loan_amount, interest_rate, loan_term, loan_interest_rate, credit_score,
                 employment_status, marital_status, remediation_strategy, missed_payments, missed_payments_duration, successful, timestamp])

# Create DataFrame
columns = ['customer_id', 'age', 'gender', 'income', 'loan_type', 'loan_amount', 'interest_rate', 'loan_term', 'loan_interest_rate', 'credit_score',
           'employment_status', 'marital_status', 'remediation_strategy', 'missed_payments', 'missed_payments_duration', 'successful', 'timestamp']
df = pd.DataFrame(data, columns=columns)

df.to_csv('loan_remediation_data.csv', index=False)