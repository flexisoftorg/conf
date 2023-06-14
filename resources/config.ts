import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
export const developers = config.requireObject<string[]>('developers');
export const environment = pulumi.getStack();

