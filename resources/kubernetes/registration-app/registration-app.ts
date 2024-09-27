import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { registrationAppDomain } from '../../config';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { namespace } from '../namespace';
import { registrationAppSanityCredentials } from './sanity-credentials';

const config = new pulumi.Config('registration-app');

const cleanregistrationAppDomain = registrationAppDomain.slice(0, -1);

export const registrationApp = new DeploymentComponent(
  'registration-app',
  {
    image: interpolate`${artifactRepoUrl}/registration-app`,
    tag: config.require('tag'),
    host: cleanregistrationAppDomain,
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [
      { secretRef: { name: registrationAppSanityCredentials.metadata.name } },
    ],
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