import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config('shared');

export const domain = config.require('domain');
