import * as gcp from '@pulumi/gcp';
import { environment } from '../config.js';
import { apiServices } from './api-services.js';
import { provider } from './provider.js';

export const identityPool = new gcp.iam.WorkloadIdentityPool(
  'main-identity-pool',
  {
    disabled: false,
    workloadIdentityPoolId: `${environment}-github-workload-identity`,
  },
  { provider, dependsOn: apiServices },
);

export const identityPoolProvider = new gcp.iam.WorkloadIdentityPoolProvider(
  'main-identity-pool-provider',
  {
    workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: `${environment}-github-workload-identity`,
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
