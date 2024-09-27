import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { goApiDomain } from '../../config';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { namespace } from '../namespace';

const config = new pulumi.Config('api');

const cleanGoApiDomain = goApiDomain.slice(0, -1);

export const goApi = new DeploymentComponent(
  'api',
  {
    image: interpolate`${artifactRepoUrl}/api`,
    tag: config.require('tag'),
    host: cleanGoApiDomain,
    namespace: namespace.metadata.name,
    port: 8000,
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
