import * as gcp from '@pulumi/gcp';
import { apiServices } from '../../google/api-services';
import { region } from '../../google/config';
import { provider } from '../../google/provider';

export const ipAddress = new gcp.compute.Address(
  'flexisoft-core-address',
  {
    name: 'flexisoft-core-address',
    addressType: 'EXTERNAL',
    region,
  },
  { provider, dependsOn: apiServices },
);
