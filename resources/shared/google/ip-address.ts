import * as google from '@pulumi/google-native';
import { region } from '../../google/config';
import { provider } from './native-provider';

export const ipAddress = new google.compute.v1.Address(
  'flexisoft-core-address',
  {
    name: 'flexisoft-core-address',
    addressType: 'EXTERNAL',
    region,
  },
  { provider },
);
