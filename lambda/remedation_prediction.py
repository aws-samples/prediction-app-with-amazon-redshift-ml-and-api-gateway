
import os
import time

import boto3


MAX_CHECK_RETRIES = 7

MAX_ERROR_RETRIES = 3


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
    query_id = response['Id']

    fetch_counter = 0
    failed_counter = 0

    status = "n/a"


    # Wait for the query to complete
    while True:
        status = redshift_data.describe_statement(Id=query_id)['Status']
        fetch_counter += 1
        
        print(f"attempt {fetch_counter} out of {MAX_CHECK_RETRIES}")
        
        if status == 'FINISHED' and fetch_counter <= MAX_CHECK_RETRIES:
            print("Query execution finished")
            break
        
        elif fetch_counter > MAX_CHECK_RETRIES:
            print("Max check retries reached")
            raise Exception("Query did not finish in time")
        
        elif status == 'FAILED' and failed_counter <= MAX_ERROR_RETRIES:
            print("query failed, will attempt to retry")
            failed_counter += 1
            response = redshift_data.execute_statement(
                WorkgroupName=redshift_workgroup_name,
                Database=redshift_database,
                Sql=predict_sql
            )
            query_id = response['Id']

        elif failed_counter > MAX_ERROR_RETRIES:
            print("Maximum error retries reached")
            raise Exception(f"Query failed: {redshift_data.describe_statement(Id=response['Id'])['Error']}")

        
        time.sleep(3)  # Wait for 3 seconds before checking the status again


    if status == 'FINISHED':
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
        
