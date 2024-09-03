# Prediction App with Amazon Redshift ML and API Gateway

This sample shows how to leverage [Amazon Redshift](https://aws.amazon.com/redshift/) to implement a machine learning model.

This sample will leverage the [serverless](https://aws.amazon.com/redshift/redshift-serverless/) flavor of Amazon Redshift.

It uses [Amazon Redshift ML](https://aws.amazon.com/redshift/features/redshift-ml/) to achieve this. The idea is that you can use simple [SQL](https://aws.amazon.com/what-is/sql/) commands to create a model based on a dataset; and help achieve predictive analytics.

Additionally, it serves the generated machine learning model via an API Endpoint, which is implemented using [Amazon API Gateway](https://aws.amazon.com/api-gateway/) and [AWS Lambda](https://aws.amazon.com/api-gateway/).

The API Layer is protected by an authorization layer provided by [Amazon Cognito](https://aws.amazon.com/cognito/). Lastly, it shows how to use [AWS Web Application Firewall (WAF)](https://aws.amazon.com/waf/) to prevent attacks such as [bot attacks](https://www.cloudflare.com/en-gb/learning/bots/what-is-a-bot-attack/), [DDoS](https://www.cloudflare.com/en-gb/learning/ddos/what-is-a-ddos-attack/) etc.


## Use case / domain 

The use case in this sample is for a lending bank - wanting to optimize their communication strategies for their customers who may be on the verge of defaulting on their loan payments.

We assume the existence of a combined dataset that contains historical information about customers, their demographics, type of loan offered, a remediation strategy that was applied - and the outcome of that strategy - ie. whether the remediation strategy help the customer stop defaulting on their loan payments.

And we apply Amazon Redshift ML on this dataset to get prediction on particular strategies being effective or not for future potential defaulters.

## Synthetic data

The synthetic dataset is in the form of a [csv](./synthetic-dataset/loan_remediation_data.csv) file in the [synthetic-dataset](./synthetic-dataset/) directory. This script uses the [faker](https://faker.readthedocs.io/en/master/) library to generate the synthetic data, and [pandas](https://pandas.pydata.org/) library to create the csv.

It was generated using a [Python script](./scripts/dataset-generation/raw_data.py) which can be found in the [scripts/dataset-generation](./scripts/dataset-generation/) directory.

To modify the generated dataset generation (or generate it again), you can run the script:
```
# change into the script directory
cd scripts/dataset-generation

# create a virtual environment (if not already done)
python3 -m venv .venv

# activate the virtual environment 
source .venv/bin/activate 
# for other shells like the fish shell, you can add ".fish" at the end of the above command

# install the dependencies
pip install -r requirements.txt

# run the script
python raw_data.py
```
Note - it generates the file in the same directory as the script is located instead of the [synthetic-dataset](./synthetic-dataset/) directory.

## Deploying the solution

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

### Bootstrap CDK environment (if not already done)

Bootstrapping provisions resources in your environment such as an Amazon Simple Storage Service (Amazon S3) bucket for storing files and AWS Identity and Access Management (IAM) roles that grant permissions needed to perform deployments. These resources get provisioned in an AWS CloudFormation stack, called the bootstrap stack. It is usually named CDKToolkit. Like any AWS CloudFormation stack, it will appear in the AWS CloudFormation console of your environment once it has been deployed. More details can be found [here](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html).

```
npx cdk bootstrap

# You can optionally specify `--profile` at the end of that command if you wish to not use the default AWS profile.
```

### Set the environment variable for REDSHIFT_TABLE_NAME
This environment variable should be the same as the table you will create in the Redshift Query Editor (after the infrastructure is deployed). This is the dataset on which the Machine learning model is trained.
```
export REDSHIFT_TABLE_NAME=public.<enter_the_name_for_your_redshift_table>
```

Note - we are expecting to create this table in the "public" schema of Redshift's dev database. You can have it in any other schema, but you will have to modify the permissions and code in the Lambda function accordingly.

### Deploy the infrastructure

* Deploy base infrastructure - this will deploy the VPC, and security group for Redshift Serverless. Additionally, it creates an Amazon S3 bucket, and uploads the synthetic data to this bucket using the [S3 Bucket Deployment CDK construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html). If you wish to modify the CIDR block for the VPC, you can do so in the [lib/base-infra-stack.ts](./lib/base-infra-stack.ts#L26)
  ```
  npx cdk deploy BaseInfraStack
  
  # You can optionally specify `--profile` at the end of that command if you wish to not use the default AWS profile.
  ```

* Deploy the Redshift Serverless stack - this deploys the Redshift serverless [namespace and workgroup](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-workgroup-namespace.html) alongwith the [Secrets Manager](https://aws.amazon.com/secrets-manager/) secret for the root user of the database.
  ```
  npx cdk deploy RedshiftServerlessStack
    
  # You can optionally specify `--profile` at the end of that command if you wish to not use the default AWS profile.
  ```
  Note - if you want to override the default Redshift Serverless Default Database, Namespace and Workgroup names, you can specify these environment variables: `REDSHIFT_DB_NAME`, `REDSHIFT_SERVERLESS_NAMESPACE`, and `REDSHIFT_SERVERLESS_WORKGROUP` respectively.

* Deploy the App stack - this will deploy the Lambda function, API Gateway, and Cognito bits. 
  ```
  npx cdk deploy AppStack
    
  # You can optionally specify `--profile` at the end of that command if you wish to not use the default AWS profile.
  ```

* Deploy the WAF Stack - this will deploy the Web Application Firewall with some pre-configured rules.
  ```
  npx cdk deploy WAFStack
    
  # You can optionally specify `--profile` at the end of that command if you wish to not use the default AWS profile.
  ```


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