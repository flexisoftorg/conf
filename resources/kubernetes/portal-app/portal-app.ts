import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { DeploymentComponent } from '../../components/deployment';
import { artifactRepoUrl } from '../../shared/google/artifact-registry';
import { provider as kubernetesProvider } from '../../shared/kubernetes/provider';
import { customerConfigMap } from '../customer-config';
import { namespace } from '../namespace';

const config = new pulumi.Config('portal-app');

export const portalApp = new DeploymentComponent(
  'portal-app',
  {
    image: interpolate`${artifactRepoUrl}/portal-app`,
    tag: config.require('tag'),
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [
      { configMapRef: { name: customerConfigMap.metadata.name } },
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

new k8s.networking.v1.Ingress(
  'wildcard-ingress',
  {
    metadata: {
      name: 'app-wildcard',
      namespace: namespace.metadata.name,
      annotations: {
        'kubernetes.io/ingress.class': 'caddy',
      },
    },
    spec: {
      rules: [
        {
          host: `*.app.${cleanPortalApiDomain}`,
          http: {
            paths: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: portalApp.service.metadata.name,
                    port: { number: portalApp.port },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  { provider: kubernetesProvider },
);
