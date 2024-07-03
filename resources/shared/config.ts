import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config('shared');

export const rootDomain = config.require('root-domain');
export const devDomain = config.require('dev-domain');
export const rootDevDomain = config.require('root-dev-domain');
export const studioDevSubDomain = config.require('studio-dev-sub-domain');

export const sanityApiToken = config.requireSecret('sanity-api-token');
export const sanityProjectId = config.require('sanity-project-id');
