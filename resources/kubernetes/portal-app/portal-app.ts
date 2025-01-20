import * as kubernetes from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { portalAppDomain } from '../../config';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';

const config = new pulumi.Config('portal-app');

// In order to store the license key in a way k8s can consume it, we need to base64 encode it.
// In order to use it in pulumi, we need to decode it.
const base64EncodedValue = config.requireSecret('ag-grid-license-key');
const agGridLicenseKey = base64EncodedValue.apply((licenseKey) => Buffer.from(licenseKey, 'base64').toString('utf-8'));

export const portalAppEnvSecrets = new kubernetes.core.v1.Secret(
  'portal-app-env-secrets',
  {
    metadata: {
      name: 'portal-app-env-secrets',
      namespace: namespace.metadata.name,
    },
    data: {
      AG_GRID_LICENSE_KEY: agGridLicenseKey,
    },
  },
  { provider: kubernetesProvider },
);

const cleanPortalAppDomain = portalAppDomain.slice(0, -1);

export const portalApp = new DeploymentComponent(
  'portal-app',
  {
    image: interpolate`${artifactRepoUrl}/portal-app`,
    tag: config.require('tag'),
    host: cleanPortalAppDomain,
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [
      { configMapRef: { name: customerConfigMap.metadata.name } },
      { secretRef: { name: portalAppEnvSecrets.metadata.name } }
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
