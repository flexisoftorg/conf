import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';
import { debitorPortalCredentials } from './debitor-portal-credentials';
import {debitorPaymentProvider} from './debitor-portal-payment-provider';

const config = new pulumi.Config('debitor-portal-app');

export const debitorPortalAppDomain = config.require('domain');
const cleanDebitorPortalAppDomain = debitorPortalAppDomain.slice(0, -1);

export const debitorPortalApp = new DeploymentComponent(
  'debitor-portal-app',
  {
    image: interpolate`${artifactRepoUrl}/debitor-portal-app`,
    tag: config.require('tag'),
    namespace: namespace.metadata.name,
    host: cleanDebitorPortalAppDomain,
    port: 8000,
    envFrom: [
      { configMapRef: { name: customerConfigMap.metadata.name } },
      { secretRef: { name: debitorPortalCredentials.metadata.name } },
      { configMapRef: { name: debitorPaymentProvider.metadata.name } },
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
