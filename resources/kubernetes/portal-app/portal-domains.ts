import * as k8s from '@pulumi/kubernetes';
import { customers } from '../../get-customers';
import { provider } from '../../shared/kubernetes/provider';
import { portalApi } from '../portal-api/portal-api';
import { namespace } from './namespace';
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
              },
              labels: {
                customer: customer.ident.current,
                kind: 'customer-domain',
              }
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
              ],
            },
          },
          { provider },
        ),
    ),
);
