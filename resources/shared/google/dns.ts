import * as gcp from '@pulumi/gcp';
import { debitorPortalAppDevDomain, portalAppDevDomain } from '../../config';
import { apiServices } from '../../google/api-services';
import { provider } from '../../google/provider';
import { portalApiDevDomain } from '../../kubernetes/portal-api/portal-api';
import { devDomain, rootDomain, studioDevSubDomain } from '../config';
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
  'portal-app-ipv4-dev',
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
  'debitor-portal-app-ipv4-dev',
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
  'portal-api-dev',
  {
    managedZone: devZone.name,
    name: portalApiDevDomain,
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
    name: studioDevSubDomain,
    type: 'CNAME',
    ttl: 300,
    rrdatas: ['flexisoftorg.github.io.'],
  },
  { provider },
);

export const zone = new gcp.dns.ManagedZone(
  'main-zone',
  {
    name: 'main-zone',
    dnsName: rootDomain,
    description: 'DNS zone for domain used internally/for development',
  },
  { provider, dependsOn: apiServices },
);
