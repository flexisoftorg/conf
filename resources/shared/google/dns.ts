import * as gcp from '@pulumi/gcp';
import { provider } from '../../google/provider';
import { domain } from '../config';

export const zone = new gcp.dns.ManagedZone(
  'main-zone',
  {
    name: 'main-zone',
    dnsName: domain,
    description: 'Main zone',
  },
  { provider },
);
