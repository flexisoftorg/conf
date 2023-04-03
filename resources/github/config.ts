import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

export const token = config.requireSecret('token');
export const owner = config.require('owner');
