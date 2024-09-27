import * as gcp from '@pulumi/gcp';
import {
  debitorPortalAppDomain,
  portalAppDomain,
  registrationAppDomain,
  goApiDomain,
} from '../../config';
import { apiServices } from '../../google/api-services';
import { provider } from '../../google/provider';
import { portalApiDomain } from '../../kubernetes/portal-api/portal-api';
import { rootDomain, studioSubDomain } from '../config';
import { ipAddress } from './ip-address';

export const ingressIpAddress = ipAddress.address;

/**
 * DNS records for production zone
 */

export const zone = new gcp.dns.ManagedZone(
  'root-zone',
  {
    name: 'root-zone',
    dnsName: rootDomain,
    description: 'DNS zone for root domain for production use',
  },
  { provider, dependsOn: apiServices },
);

new gcp.dns.RecordSet(
  'portal-app-a',
  {
    managedZone: zone.name,
    name: portalAppDomain,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);
new gcp.dns.RecordSet(
  'debitor-portal-app-a',
  {
    managedZone: zone.name,
    name: debitorPortalAppDomain,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'portal-api-a',
  {
    managedZone: zone.name,
    name: portalApiDomain,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'studio-a',
  {
    managedZone: zone.name,
    name: studioSubDomain,
    type: 'CNAME',
    ttl: 300,
    rrdatas: ['flexisoftorg.github.io.'],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'registration-app-a',
  {
    managedZone: zone.name,
    name: registrationAppDomain,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'go-api-a',
  {
    managedZone: zone.name,
    name: goApiDomain,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);
