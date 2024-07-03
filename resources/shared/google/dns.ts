import * as gcp from '@pulumi/gcp';
import { debitorPortalAppDevDomain, portalAppDevDomain } from '../../config';
import { apiServices } from '../../google/api-services';
import { provider } from '../../google/provider';
import { portalApiDomain } from '../../kubernetes/portal-api/portal-api';
import { devDomain, studioSubDomain } from '../config';
import { ipAddress } from './ip-address';

const ingressIpAddress = ipAddress.address;

export const devZone = new gcp.dns.ManagedZone(
  'dev-zone',
  {
    name: 'dev-zone',
    dnsName: devDomain,
    description: 'DNS zone for domain used internally/for development',
  },
  { provider, dependsOn: apiServices },
);

/**
 * Portal App DNS records
 * ----------------------
 *
 */

new gcp.dns.RecordSet(
  'portal-app-ipv4',
  {
    managedZone: devZone.name,
    name: portalAppDevDomain,
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
    name: debitorPortalAppDevDomain,
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
    name: portalApiDomain,
    type: 'A',
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  'studio',
  {
    managedZone: devZone.name,
    name: studioSubDomain,
    type: 'CNAME',
    ttl: 300,
    rrdatas: ['flexisoftorg.github.io.'],
  },
  { provider },
);
