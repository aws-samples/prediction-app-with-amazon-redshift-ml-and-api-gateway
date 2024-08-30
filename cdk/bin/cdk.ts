#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseInfraStack } from '../lib/base-infra-stack';
import { RedshiftServerlessStack } from '../lib/redshift-serverless-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiAndCognitoStack } from '../lib/api-and-cognito-stack';
import { WAFStack } from '../lib/WAF-stack';

const app = new cdk.App();

// contains the basic VPC that will be used for creating Redshift Serverless
const baseInfra = new BaseInfraStack(app, 'BaseInfraStack', {});

// 
const redshiftServerless = new RedshiftServerlessStack(app, 'RedshiftServerlessStack', {
  vpc: baseInfra.vpc,
  secGroup: baseInfra.redshiftServerlessSecGroup
});

// Create the Lambda stack
const lambdaStack = new LambdaStack(app, 'LambdaStack', {
  redshiftNamespace: redshiftServerless.redshiftNamespace,
  redshiftWorkgroup: redshiftServerless.redshiftWorkgroup,
});

// Create the API and Cognito stack
const apiAndCognitoStack = new ApiAndCognitoStack(app, 'ApiAndCognitoStack', {
  lambda: lambdaStack.lambda,
});

// Create the WAF stack
const wafStack = new WAFStack(app, 'WAFStack', {
  apiAndCognitoStack: apiAndCognitoStack,
});

