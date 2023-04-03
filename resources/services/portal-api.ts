import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';
import { CloudRunService } from '../components/cloud-run-service';
import { portalAppDomain } from '../config';
import { project, region } from '../google/config';
import { provider } from '../google/provider';
import { domain } from '../shared/config';
import { artifactRepoUrl } from '../shared/google/artifact-registry';
import { zone } from '../shared/google/dns';

const config = new pulumi.Config('portal-api');

const authSignSecret = config.requireSecret('auth-sign-secret');
const cookieSecret = config.requireSecret('cookie-secret');

export const portalApiDomain = config.require('domain');
const cleanPortalApiDomain = portalApiDomain.slice(0, -1);

const service = new CloudRunService(
  'portal-api',
  {
    tag: config.require('tag'),
    imageName: interpolate`${artifactRepoUrl}/portal-api`,
    // TODO: Add these as injected secrets. Remember to rotate them.
    // secrets: [
    //   { name: 'COOKIE_SECRET', value: cookieSecret },
    //   { name: 'AUTH_SIGN_SECRET', value: authSignSecret },
    // ],
    envs: [
      {
        name: 'FRONTEND_URL',
        value: interpolate`https://${portalAppDomain.slice(0, -1)}`,
      },
      { name: 'SELF_DOMAIN', value: domain.slice(0, -1) },
      { name: 'SELF_URL', value: interpolate`https://${cleanPortalApiDomain}` },

      // TODO: Remove these once secrets are injected.
      { name: 'COOKIE_SECRET', value: cookieSecret },
      { name: 'AUTH_SIGN_SECRET', value: authSignSecret },
    ],
  },
  { providers: [provider] },
);

new gcp.dns.RecordSet(
  'portal-api',
  {
    managedZone: zone.name,
    name: portalApiDomain,
    type: 'CNAME',
    ttl: 300,
    rrdatas: ['ghs.googlehosted.com.'],
  },
  { provider },
);

new gcp.cloudrun.DomainMapping(
  'portal-api',
  {
    location: region,
    metadata: {
      namespace: project,
    },
    spec: {
      routeName: service.service.name,
    },
    name: cleanPortalApiDomain,
  },
  { provider },
);
