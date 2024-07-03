import * as k8s from '@pulumi/kubernetes';
import * as gcp from '@pulumi/gcp';
import { customers } from '../../get-customers';
import { provider } from '../../shared/kubernetes/provider';
import { debitorPortalApp } from '../debitor-portal-app/debitor-portal-app';
import { namespace } from '../namespace';
import { portalApi } from '../portal-api/portal-api';
import { portalApp } from './portal-app';
import { ingressIpAddress, zone } from '../../shared/google/dns';
import { rootDomain } from '../../shared/config';

customers.apply(customers =>
  customers.map(customer => {
    const customerDomain = customer.domain
      ? customer.domain
      : `${customer.ident.current}.${rootDomain}`;

    const domainKind = customer.domain ? 'customer-domain' : 'root-domain';
    const debitorPortalDomain = customerDomain;
    const creditorPortalDomain = `kred.${customerDomain}`;
    const apiDomain = `api.${customerDomain}`;

    if (!customer.domain) {
      new gcp.dns.RecordSet(
        `${customer.ident.current}-creditor-portal`,
        {
          managedZone: zone.name,
          name: creditorPortalDomain,
          type: 'A',
          ttl: 300,
          rrdatas: [ingressIpAddress],
        },
        { provider },
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
        { provider },
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
        { provider },
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
            kind: domainKind,
          },
        },
        spec: {
          rules: [
            {
              host: `kred.${customerDomain}`,
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
              host: `api.${customerDomain}`,
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
              host: `${customerDomain}`,
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
