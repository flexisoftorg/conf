import * as gcp from '@pulumi/gcp';
import { portalAppDomain } from '../../config';
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

/**
 * Note: Portal API DNS records are managed in resources/services/portal-api.ts
 */

/**
 * Portal App DNS records
 * ----------------------
 *
 */

new gcp.dns.RecordSet(
  'portal-app-ipv4',
  {
    managedZone: zone.name,
    name: portalAppDomain,
    type: 'A',
    ttl: 300,
    rrdatas: ['199.36.158.100'],
  },
  { provider },
);

