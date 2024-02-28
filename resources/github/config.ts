import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config('github');

export const token = config.requireSecret('flexisoftorg-token');
export const owner = config.require('owner');
