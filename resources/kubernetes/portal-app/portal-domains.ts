import * as k8s from '@pulumi/kubernetes';
import { customers } from '../../get-customers';
import { provider } from '../../shared/kubernetes/provider';
import { debitorPortalApp } from '../debitor-portal-app/debitor-portal-app';
import { namespace } from '../namespace';
import { portalApi } from '../portal-api/portal-api';
import { portalApp } from './portal-app';

customers.apply(customers =>
  customers
    .filter(c => c.domain)
    .map(
      customer =>
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
                  host: customer.domain,
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
                  host: `api.${customer.domain}`,
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
                  host: `debitor.${customer.domain}`,
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
        ),
    ),
);
