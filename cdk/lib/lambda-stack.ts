import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as redshiftserverless from 'aws-cdk-lib/aws-redshiftserverless';
import { table } from 'console';


interface LambdaStackProps extends cdk.StackProps {
  redshiftNamespace: redshiftserverless.CfnNamespace;
  redshiftWorkgroup: redshiftserverless.CfnWorkgroup;
}

export class LambdaStack extends cdk.Stack {
  public readonly lambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const tableName = process.env.REDSHIFT_TABLE_NAME;
    if (tableName === undefined || tableName === '') {
        throw new Error('Please specify the "REDSHIFT_TABLE_NAME" env var')
    };
    console.log(`Redshift tablen name: ${tableName}`);

    // Create the Lambda function
    this.lambda = new lambda.Function(this, 'RemedationPredictionLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('./lambda'),
      handler: 'remedation_prediction.lambda_handler',
      environment: {
        WORKGROUP_NAME: props.redshiftWorkgroup.workgroupName,
        REDSHIFT_DATABASE: 'dev',
        REDSHIFT_TABLE_NAME: tableName
      },
      timeout: cdk.Duration.seconds(30), // Set the timeout to 30 seconds
    });

    this.lambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["redshift-data:*", "redshift-serverless:GetCredentials"],
        resources: ["*"],
      })
    );


  }
}
