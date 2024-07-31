import * as gcp from '@pulumi/gcp';
import { apiServices } from '../../google/api-services';
import { provider } from '../../google/provider';
import { ipAddress } from './ip-address';

const ingressIpAddress = ipAddress.address;

// Legacy DNS records, to be deleted as they are only used by older tenants
// who have their own DNS records poiting to bjerk.dev

export const devZone = new gcp.dns.ManagedZone(
  'main-zone',
  {
    name: 'main-zone',
    dnsName: 'flexisoft.bjerk.dev.',
    description: 'Main zone',
  },
  { provider, dependsOn: apiServices },
);

new gcp.dns.RecordSet(
  'portal-app-ipv4',
  {
    managedZone: devZone.name,
    name: 'flexisoft.bjerk.dev.',
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'debitor-portal-app-ipv4',
  {
    managedZone: devZone.name,
    name: 'debitor.flexisoft.bjerk.dev.',
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'portal-api',
  {
    managedZone: devZone.name,
    name: 'api.flexisoft.bjerk.dev.',
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);
