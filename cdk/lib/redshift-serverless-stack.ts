import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as aws_secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as redshiftserverless from "aws-cdk-lib/aws-redshiftserverless"


export interface RedshiftServerlessStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  secGroup: ec2.SecurityGroup;
}

export class RedshiftServerlessStack extends cdk.Stack {
  readonly redshiftCreds: aws_secretsmanager.Secret;
  public readonly redshiftNamespace: redshiftserverless.CfnNamespace;
  public readonly redshiftWorkgroup: redshiftserverless.CfnWorkgroup;
  
  accountId: string;

  constructor(scope: Construct, id: string, props: RedshiftServerlessStackProps) {
    super(scope, id, props);

    // setting account ID
    this.accountId = cdk.Stack.of(this).account;

    // passed in as property
    const vpc = props.vpc;

    const redshiftAdminUsername = 'admin';

    const redshiftserverlessAdminSecret = new aws_secretsmanager.Secret(
      this, 'insightsRedshiftServerlessAdminSecret', {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: redshiftAdminUsername }),
          generateStringKey: 'password',
          excludePunctuation: true,
        }
      }
    );
  
    const redshiftserverlessNamespaceRole = new iam.Role(this, 'RedshiftServerlessNamespaceRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('redshift.amazonaws.com'),
        new iam.ServicePrincipal('redshift-serverless.amazonaws.com'),
        new iam.ServicePrincipal('sagemaker.amazonaws.com')
        ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRedshiftAllCommandsFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRedshiftFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSGlueConsoleFullAccess'),
      ],
      });

      const redshiftserverlessKmsKey = new kms.Key(this, 'RedshiftserverlessKmsKey', {enabled: true});

      const warehouseDBName = 'dev';
  
      const redshiftServerlessNamespaceName = 'loan-remediation-ns';

      const cfnNamespace = new redshiftserverless.CfnNamespace(this, 'RedshiftServerlessNamespace',{
        namespaceName: redshiftServerlessNamespaceName,
        adminUsername: redshiftAdminUsername,
        adminUserPassword: redshiftserverlessAdminSecret.secretValueFromJson('password').unsafeUnwrap(),
        dbName: warehouseDBName,
        defaultIamRoleArn: redshiftserverlessNamespaceRole.roleArn,
        iamRoles: [redshiftserverlessNamespaceRole.roleArn],
        kmsKeyId: redshiftserverlessKmsKey.keyId,
        logExports: ['userlog', 'connectionlog', 'useractivitylog']
     });

     const redshiftserverlessWorkgroupName = 'loan-remediation-wg';

     const cfnWorkgroup = new redshiftserverless.CfnWorkgroup(this, 'RedshiftServerlessWorkgroup',
     {
       workgroupName: redshiftserverlessWorkgroupName,
       baseCapacity: 32,
       enhancedVpcRouting: false,
       publiclyAccessible: false,
       securityGroupIds: [props.secGroup.securityGroupId],
       subnetIds: vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS}).subnetIds,
       namespaceName: cfnNamespace.namespaceName,
       configParameters: [{parameterKey: 'max_query_execution_time', parameterValue: '14400'}]
     });
     cfnWorkgroup.addDependency(cfnNamespace);

     // Expose the created resources as properties
    this.redshiftNamespace = cfnNamespace;
    this.redshiftWorkgroup = cfnWorkgroup;

  }
}

