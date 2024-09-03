import * as cdk from 'aws-cdk-lib';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

interface WAFStackProps extends cdk.StackProps {
  api: apigw.RestApi;
}

export class WAFStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WAFStackProps) {
    super(scope, id, props);

    // Define the WAF scope
    const wafScope = 'REGIONAL';

    /**
     * Setup WAF Rules
    */
    let wafRules:Array<waf.CfnWebACL.RuleProperty>  = [];
    
    // 1 AWS Managed Rules
    let awsManagedRules:waf.CfnWebACL.RuleProperty = {
      name: 'AWS-AWSManagedRulesCommonRuleSet',
      priority: 1,
      overrideAction: {none: {}},
      statement: {
        managedRuleGroupStatement: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          excludedRules: [{name: 'SizeRestrictions_BODY'}]
        }
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'awsCommonRules',
        sampledRequestsEnabled: true
      }
    };
    wafRules.push(awsManagedRules);

    // 2 AWS AnonIPAddress
    let awsAnonIPList:waf.CfnWebACL.RuleProperty = {
      name: 'awsAnonymousIP',
      priority: 2,
      overrideAction: {none: {}},
      statement: {
        managedRuleGroupStatement: {
          name: 'AWSManagedRulesAnonymousIpList',
          vendorName: 'AWS',
          excludedRules: []
        }
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'awsAnonymous',
        sampledRequestsEnabled: true
      }
    };
    wafRules.push(awsAnonIPList);

    // 3 AWS AnonIPAddress
    let awsIPReputationList:waf.CfnWebACL.RuleProperty = {
      name: 'awsIPReputation',
      priority: 3,
      overrideAction: {none: {}},
      statement: {
        managedRuleGroupStatement: {
          name: 'AWSManagedRulesAmazonIpReputationList',
          vendorName: 'AWS',
          excludedRules: []
        }
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'ipReputationList',
        sampledRequestsEnabled: true
      }
    };
    wafRules.push(awsIPReputationList);

    // Create the WebACL resource
    const webACL = new waf.CfnWebACL(this, 'WebACL', {
      scope: wafScope,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'myWebACL',
        sampledRequestsEnabled: true,
      },
      rules: wafRules,
      defaultAction: { allow: {} },
    });
    
    // Associate the WebACL with the API Gateway
    new waf.CfnWebACLAssociation(this, 'WebACLAssociation', {
      webAclArn: webACL.attrArn,
    resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${props.api.restApiId}/stages/prod`,
    });
  }
}