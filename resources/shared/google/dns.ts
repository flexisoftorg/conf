import * as gcp from '@pulumi/gcp';
import { apiServices } from '../../google/api-services';
import { provider } from '../../google/provider';
import { domain, studioSubDomain } from '../config';
import { ipAddress } from './ip-address';

const ingressIpAddress = ipAddress.address;

export const zone = new gcp.dns.ManagedZone(
  'main-zone',
  {
    name: 'main-zone',
    dnsName: domain,
    description: 'Main zone',
  },
  { provider, dependsOn: apiServices },
);

/**
 * Note: Portal API DNS records are managed in resources/services/portal-api.ts
 */

/**
 * Portal App DNS records
 * ----------------------
 *
 */

new gcp.dns.RecordSet(
  'tenant-api',
  {
    managedZone: zone.name,
    name: `tenant.${domain}`,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'studio',
  {
    managedZone: zone.name,
    name: studioSubDomain,
    type: 'CNAME',
    ttl: 300,
    rrdatas: ['flexisoftorg.github.io.'],
  },
  { provider },
);

/**
 * Demo App DNS records
 */

new gcp.dns.RecordSet(
  'portal-app-ipv4',
  {
    managedZone: zone.name,
    name: domain,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'portal-api',
  {
    managedZone: zone.name,
    name: `api.${domain}`,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);