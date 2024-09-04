
import json
import os
import time

import boto3


def lambda_handler(event, context):
    # Retrieve the input parameters from the API request
    age = event['age']
    gender = event['gender']
    income = event['income']
    loan_type = event['loan_type']
    loan_amount = event['loan_amount']
    interest_rate = event['interest_rate']
    loan_term = event['loan_term']
    loan_interest_rate = event['loan_interest_rate']
    credit_score = event['credit_score']
    employment_status = event['employment_status']
    marital_status = event['marital_status']
    remediation_strategy = event['remediation_strategy']
    missed_payments = event['missed_payments']
    missed_payments_duration = event['missed_payments_duration']

    # Retrieve the Redshift Serverless connection details from environment variables
    redshift_workgroup_name = os.environ['WORKGROUP_NAME']
    redshift_database = os.environ['REDSHIFT_DATABASE']

    table_name = os.environ["REDSHIFT_TABLE_NAME"]

    prediction_fn_name = os.environ["PREDICTION_FUNCTION_NAME"]

    # Construct the SQL query to get predictions
    predict_sql = f"""
    SELECT
        {prediction_fn_name} (
            {age}, '{gender}', {income}, '{loan_type}', {loan_amount}, {interest_rate}, {loan_term}, {loan_interest_rate}, {credit_score},
            '{employment_status}', '{marital_status}', '{remediation_strategy}', {missed_payments}, {missed_payments_duration}
        ) AS effective
    FROM {table_name}
    LIMIT 1;
    """

    # Use the Redshift Data API to execute the SQL query
    redshift_data = boto3.client('redshift-data')
    response = redshift_data.execute_statement(
        WorkgroupName=redshift_workgroup_name,
        Database=redshift_database,
        Sql=predict_sql
    )

    # Wait for the query to complete
    while True:
        status = redshift_data.describe_statement(Id=response['Id'])['Status']
        if status == 'FINISHED':
            break
        elif status == 'FAILED':
            raise Exception(f"Query failed: {redshift_data.describe_statement(Id=response['Id'])['Error']}")
        time.sleep(3)  # Wait for 1 second before checking the status again

    # Retrieve the prediction result
    prediction_result = redshift_data.get_statement_result(Id=response['Id'])

    # Check if the query returned any result
    if prediction_result['Records']:
        effective = prediction_result['Records'][0][0]['booleanValue']
        # Return the prediction result as the API response
        return {
            'statusCode': 200,
            'body': {'effective': effective}
        }
    else:
        return {
            'statusCode': 200,
            'body': {'message': 'No prediction result found'}
        }
