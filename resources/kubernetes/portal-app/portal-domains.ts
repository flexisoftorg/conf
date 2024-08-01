import * as k8s from '@pulumi/kubernetes';
import * as gcp from '@pulumi/gcp';
import { customers } from '../../get-customers';
import { provider as gcpProvider } from '../../google/provider';
import { rootDomain } from '../../shared/config';
import { ingressIpAddress, zone } from '../../shared/google/dns';
import { provider } from '../../shared/kubernetes/provider';
import { debitorPortalApp } from '../debitor-portal-app/debitor-portal-app';
import { namespace } from '../namespace';
import { portalApi } from '../portal-api/portal-api';
import { portalApp } from './portal-app';

customers.apply(customers =>
  customers.map(customer => {
    const cleanRootDomain = rootDomain.slice(0, -1);

    const domain = customer.domain
      ? customer.domain
      : `${customer.ident.current}.${cleanRootDomain}`;

    const hasCustomDomain = Boolean(customer.domain?.trim());

    // TODO: Revise this logic once it is safe to do so (every customer is using non custom domains)
    const debitorPortalDomain = hasCustomDomain ? `debitor.${domain}` : domain;
    const creditorPortalDomain = hasCustomDomain ? domain : `kred.${domain}`;
    const apiDomain = `api.${domain}`;

    if (!hasCustomDomain) {
      // we need to create DNS records for the customer's subdomains under the root domain zone
      new gcp.dns.RecordSet(
        `${customer.ident.current}-creditor-portal`,
        {
          managedZone: zone.name,
          name: creditorPortalDomain,
          type: 'A',
          ttl: 300,
          rrdatas: [ingressIpAddress],
        },
        { provider: gcpProvider },
      );
      new gcp.dns.RecordSet(
        `${customer.ident.current}-debitor-portal`,
        {
          managedZone: zone.name,
          name: debitorPortalDomain,
          type: 'A',
          ttl: 300,
          rrdatas: [ingressIpAddress],
        },
        { provider: gcpProvider },
      );

      new gcp.dns.RecordSet(
        `${customer.ident.current}-api`,
        {
          managedZone: zone.name,
          name: apiDomain,
          type: 'A',
          ttl: 300,
          rrdatas: [ingressIpAddress],
        },
        { provider: gcpProvider },
      );
    }

    new k8s.networking.v1.Ingress(
      `${customer.ident.current}-ingress`,
      {
        metadata: {
          name: `customer-${customer.ident.current}`,
          namespace: namespace.metadata.name,
          annotations: {
            'kubernetes.io/ingress.class': 'caddy',

            'pulumi.com/skipAwait': 'true',
          },
          labels: {
            customer: customer.ident.current,
            kind: 'customer-domain',
          },
        },
        spec: {
          rules: [
            {
              host: creditorPortalDomain.slice(0, -1),
              http: {
                paths: [
                  {
                    path: '/',
                    pathType: 'Prefix',
                    backend: {
                      service: {
                        name: portalApp.service.metadata.name,
                        port: { number: portalApp.port },
                      },
                    },
                  },
                ],
              },
            },
            {
              host: apiDomain.slice(0, -1),
              http: {
                paths: [
                  {
                    path: '/',
                    pathType: 'Prefix',
                    backend: {
                      service: {
                        name: portalApi.service.metadata.name,
                        port: { number: portalApi.port },
                      },
                    },
                  },
                ],
              },
            },
            {
              host: debitorPortalDomain.slice(0, -1),
              http: {
                paths: [
                  {
                    path: '/',
                    pathType: 'Prefix',
                    backend: {
                      service: {
                        name: debitorPortalApp.service.metadata.name,
                        port: { number: debitorPortalApp.port },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      { provider },
    );
  }),
);
