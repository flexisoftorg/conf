import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config('shared');

export const devDomain = config.require('dev-domain');
export const rootDevDomain = config.require('root-dev-domain');
export const studioSubDomain = config.require('studio-sub-domain');
export const wildcardSubDomain = config.require('wildcard-sub-domain');

export const sanityApiToken = config.requireSecret('sanity-api-token');
export const sanityProjectId = config.require('sanity-project-id');
