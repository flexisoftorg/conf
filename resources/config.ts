import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

export const developers = config.requireObject<string[]>('developers');

export const environment = pulumi.getStack();

const portalAppConfig = new pulumi.Config('portal-app');

export const portalAppDomain = portalAppConfig.require('dev-domain');

const debitorPortalAppConfig = new pulumi.Config('debitor-portal-app');

export const debitorPortalAppDomain =
  debitorPortalAppConfig.require('dev-domain');
