import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';
import { debitorPortalCredentials } from './debitor-portal-credentials.js';

const config = new pulumi.Config('debitor-portal-app');

export const debitorPortalApp = new DeploymentComponent(
  'debitor-portal-app',
  {
    image: interpolate`${artifactRepoUrl}/debitor-portal-app`,
    tag: config.require('tag'),
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [
      { configMapRef: { name: customerConfigMap.metadata.name } },
      { secretRef: { name: debitorPortalCredentials.metadata.name } },
    ],
    resources: {
      requests: {
        cpu: '100m',
        memory: '128Mi',
      },
      limits: {
        cpu: '200m',
        memory: '256Mi',
      },
    },
  },
  { provider: kubernetesProvider },
);
