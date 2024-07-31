import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { portalAppDomain } from '../../config';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';

const config = new pulumi.Config('portal-app');

const cleanPortalAppDomain = portalAppDomain.slice(0, -1);

export const portalApp = new DeploymentComponent(
  'portal-app',
  {
    image: interpolate`${artifactRepoUrl}/portal-app`,
    tag: config.require('tag'),
    host: cleanPortalAppDomain,
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [{ configMapRef: { name: customerConfigMap.metadata.name } }],
    resources: {
      requests: {
        cpu: '250m',
        memory: '512Mi',
      },
      limits: {
        cpu: '250m',
        memory: '512Mi',
      },
    },
  },
  { provider: kubernetesProvider },
);
