import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config('shared');

export const domain = config.require('domain');
export const rootDomain = config.require('root-domain');
export const studioSubDomain = config.require('studio-sub-domain');
export const wildcardSubDomain = config.require('wildcard-sub-domain');

export const sanityApiToken = config.requireSecret('sanity-api-token');
export const sanityProjectId = config.require('sanity-project-id');
