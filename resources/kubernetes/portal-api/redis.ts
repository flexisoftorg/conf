import { DeploymentComponent } from '../../components/deployment';
import { provider } from '../../shared/kubernetes/provider';
import { namespace } from '../namespace';

export const redis = new DeploymentComponent(
  'redis',
  {
    image: 'redis',
    tag: '6.2.11-alpine',
    env: [{ name: 'MASTER', value: 'true' }],
    namespace: namespace.metadata.name,
    port: 6379,
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
  { provider },
);
