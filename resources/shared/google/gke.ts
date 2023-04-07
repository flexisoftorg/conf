import * as google from '@pulumi/google-native';
import { region } from '../../google/config';
import { provider } from './native-provider';

export const cluster = new google.container.v1.Cluster(
  'core-cluster',
  {
    name: 'flexisoft-main',
    releaseChannel: { channel: 'REGULAR' },
    location: region,
    autopilot: { enabled: true },
  },
  { provider, protect: true },
);
