#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseInfraStack } from '../lib/base-infra-stack';
import { RedshiftServerlessStack } from '../lib/redshift-serverless-stack';
import { PredictionAppStack } from '../lib/prediction-app-stack';
import { WAFStack } from '../lib/waf-stack';

const app = new cdk.App();

// contains the basic VPC that will be used for creating Redshift Serverless
const baseInfra = new BaseInfraStack(app, 'BaseInfraStack', {});

// Redshift serverless 
const redshiftServerless = new RedshiftServerlessStack(app, 'RedshiftServerlessStack', {
  vpc: baseInfra.vpc,
  secGroup: baseInfra.redshiftServerlessSecGroup
});

// create the prediction app stack
const appStack = new PredictionAppStack(app, 'AppStack', {
  redshiftDbName: redshiftServerless.redshiftDbName,
  redshiftNamespace: redshiftServerless.redshiftNamespace,
  redshiftWorkgroup: redshiftServerless.redshiftWorkgroup
});

// Create the WAF stack
const wafStack = new WAFStack(app, 'WAFStack', {
  api: appStack.restApi,
});
