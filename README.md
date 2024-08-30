# internship-capstone

## Description

This repository documents my internship capstone project, where I leveraged Amazon Redshift to implement a machine learning model. The goal of the model is to predict the effectiveness of a specific remediation strategy tailored to a specific customer. The following instructions outline the steps to deploy this project using CDK.

## Seeing it in action

### Pre-requisites

* Since this is a [TypeScript](https://www.typescriptlang.org/) CDK project, you should have [npm](https://www.npmjs.com/) installed (which is the package manager for TypeScript/JavaScript).
    * You can find installation instructions for npm [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

* Additionally, it would be required for your to have [AWS CLI](https://aws.amazon.com/cli/) installed on your computer.
    *  `pip install awscli`. This means need to have python installed on your computer (if it is not already installed.)
    * You need to also configure and authenticate your AWS CLI to be able to interact with AWS programmatically. Detailed instructions of how you could do that are provided [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

### Install dependencies (if not already done)

```
npm install
```

### Deploy the infrastructure

```
# make sure you are in the root directory of this project

npx cdk deploy BaseInfraStack

npx cdk deploy RedshiftServerlessStack

npx cdk deploy LambdaStack

npx cdk deploy ApiAndCognitoStack

npx cdk deploy WAFStack

```

This will deploy:
* VPC and Security Groups necessary for the Redshift Serverless environment
* Redshift Serverless namespace and workgroup
* A Lambda function that invokes the machine learning model trained in Redshift Serverless
* A REST API, a Cognito User Pool, and an application integration client associated with that user pool
* A WebACL associated with the Rest API Endpoint

### Setting up the Data and ML Model
After the RedshiftServerlessStack has been successfully deployed, follow these steps to load the data and set up the machine learning model:

* Create an S3 bucket 'loan-remediation-dataset' and upload the 'loan_remediation_data.csv' file to this bucket
* In Redshift Query Editor V2, create a table raw_data under 'dev' database and 'public' schema, and upload the synthetic dataset from the S3 bucket into the table
* Follow the instructions to create the ML model under 'public' schema using the loan_remediation table data

```
CREATE MODEL public.predict_model
FROM
    (
      SELECT age, gender, income, loan_type, loan_amount, interest_rate, loan_term, loan_interest_rate, credit_score, 
      employment_status, marital_status, remediation_strategy, missed_payments, missed_payments_duration, successful
      FROM public.raw_data
      WHERE timestamp < '2023-01-31'
     )
TARGET successful FUNCTION ml_fn_prediction
IAM_ROLE default SETTINGS (
  S3_BUCKET 'loan-remediation-data'
);
```

### Grant Permissions for Lambda IAM Role

 To enable the Lambda function to execute the prediction query, you need to grant the necessary permissions to the IAM role associated with the Lambda function. Open the Amazon Redshift Query Editor and follow these commands:

```
# Replace <lambda-role-name> with the name of the IAM role assigned to your Lambda function

CREATE ROLE lambda_role;
GRANT EXECUTE ON MODEL public.predict_model TO ROLE lambda_role;
GRANT ALL PRIVILEGES ON TABLE public.raw_data TO ROLE lambda_role;
GRANT ROLE lambda_role TO "IAMR:<lambda-role-name>";

```

### Obtain an ID token via [Postman](https://www.postman.com/)

* Create a new user in the Cognito user pool in the Cognito console
* Navigate to the "App integration" section of the Cognito User Pool and note down the "App client ID"
* Open Postman and go to the "Authorization" tab. Select the "OAuth 2.0" option as the authentication type. In the "Configure New Token" dialog, provide the following information:
    * Grant Type: Authorization Code
    * Callback URL: https://example.com 
    * Auth URL: https://remedation-app.auth.eu-north-1.amazoncognito.com/oauth2/authorize
    * Access Token URL: https://remedation-app.auth.eu-north-1.amazoncognito.com/oauth2/token
    * Client ID: <app-client-id> (replace with the App Client ID obtained above)
    * Scope: openid
* Click on the "Get New Access Token" button in Postman. The Cognito Hosted UI will appear, prompting you to sign in with the user created in step 1. If prompted, reset your password as per the instructions. After successful sign-in, Postman will display the access token and ID token. Copy the ID token for use in your API requests

### Test the authorized API endpoint

Once the token is obtained, you can now send a request to the API via [Postman](https://www.postman.com/), [cURL](https://curl.se/), [HTTPie](https://httpie.io/) etc.

The endpoint is a `Post` request on the `https://<rest-api-id>.execute-api.eu-north-1.amazonaws.com/prod/loan` route. The invocation URL for the API can be found in the API Gateway console (specifically in the Stages section). IIn Postman, switch to the "Headers" tab. Add a new header with the key `Authorization` and the value <ID_TOKEN>.  Provide the Request Body in raw format:

```
{
  "age": 38,
  "gender": "Male",
  "income": 41820,
  "loan_type": "Home",
  "loan_amount": 221750,
  "interest_rate": 0.1,
  "loan_term": 58,
  "loan_interest_rate": 10,
  "credit_score": 424,
  "employment_status": "Unemployed",
  "marital_status": "Single",
  "remediation_strategy": "Forbearance",
  "missed_payments": 9,
  "missed_payments_duration": 10
}
```

## Generic CDK instructions

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template