import * as gcp from '@pulumi/gcp';
import { apiServices } from './api-services';
import { provider } from './provider';

export const identityPool = new gcp.iam.WorkloadIdentityPool(
  'main-identity-pool',
  {
    disabled: false,
    workloadIdentityPoolId: 'github-workload-identity',
  },
  { provider, dependsOn: apiServices },
);

export const identityPoolProvider = new gcp.iam.WorkloadIdentityPoolProvider(
  'main-identity-pool-provider',
  {
    workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: 'github-workload-identity',
    oidc: {
      issuerUri: 'https://token.actions.githubusercontent.com',
    },
    attributeMapping: {
      'google.subject': 'assertion.sub',
      'attribute.actor': 'assertion.actor',
      'attribute.repository': 'assertion.repository',
    },
  },
  { provider, dependsOn: apiServices },
);
