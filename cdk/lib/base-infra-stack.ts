import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";


export class BaseInfraStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly redshiftServerlessSecGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* 
    capturing region env var to know which region to deploy this infrastructure

    NOTE - the AWS profile that is used to deploy should have the same default region
    */
    const regionPrefix = process.env.CDK_DEFAULT_REGION || 'eu-north-1';
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

  }
}