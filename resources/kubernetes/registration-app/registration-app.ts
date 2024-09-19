import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { registrationAppDomain } from '../../config';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';

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
    env: [
    {
      name: 'SANITY_API_KEY',
      valueFrom: {
        configMapKeyRef: {
      name: customerConfigMap.metadata.name,
      key: 'sanityApiKey',
        },
      },
    },
    {
      name: 'SANITY_PROJECT_ID',
      valueFrom: {
        configMapKeyRef: {
      name: customerConfigMap.metadata.name,
      key: 'sanityProjectId',
        },
      },
    },
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