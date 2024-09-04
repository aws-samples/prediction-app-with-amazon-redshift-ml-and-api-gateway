import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import path = require("path");


export class BaseInfraStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly redshiftServerlessSecGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* 
    capturing region env var to know which region to deploy this infrastructure

    NOTE - the AWS profile that is used to deploy should have the same default region
    */
    const regionPrefix = process.env.CDK_DEFAULT_REGION || 'us-east-1';
    console.log(`CDK_DEFAULT_REGION: ${regionPrefix}`);

    // create VPC to deploy the infrastructure in
    const vpc = new ec2.Vpc(this, "infraNetwork", {
      ipAddresses: ec2.IpAddresses.cidr('10.80.0.0/20'),
      availabilityZones: [`${regionPrefix}a`, `${regionPrefix}b`, `${regionPrefix}c`],
      subnetConfiguration: [
          {
            name: "public",
            subnetType: ec2.SubnetType.PUBLIC,
          },
          {
            name: "private",
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          }
      ],
    });
    this.vpc = vpc;
 
    // Create security group for test redshift serverless
    const redshiftServerlessSgName = "redshift-serverless-sg";
    const redshiftServerlessSg = new ec2.SecurityGroup(this, redshiftServerlessSgName, {
        securityGroupName: redshiftServerlessSgName,
        vpc: vpc,
        // for internet access
        allowAllOutbound: true
    });
    this.redshiftServerlessSecGroup = redshiftServerlessSg;

    // create bucket for synthetic dataset
    const dataBucket = new s3.Bucket(this, `syntheticData`, {});
    // use s3 bucket deploy to upload the local copy of the synthetic data file to s3
    new s3deploy.BucketDeployment(this, 'dataBucketDeploy', {
        sources: [s3deploy.Source.asset(path.join(__dirname, "../synthetic-dataset"))],
        destinationBucket: dataBucket
    });

  }
}