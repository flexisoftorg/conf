import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config('github');

export const token = config.requireSecret('githubToken');
export const owner = config.require('owner');
