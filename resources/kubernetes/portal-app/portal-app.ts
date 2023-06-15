import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { customerConfigMap } from '../../shared/kubernetes/customer-config';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { namespace } from '../namespace';

const config = new pulumi.Config('portal-app');

export const portalApp = new DeploymentComponent(
  'portal-app',
  {
    image: interpolate`${artifactRepoUrl}/portal-app`,
    tag: config.require('tag'),
    namespace: namespace.metadata.name,
    envFrom: [
      { configMapRef: { name: customerConfigMap.metadata.name } },
    ],
    port: 8000,
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
