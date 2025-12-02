import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import { customers } from "../get-customers.js";
import { provider as gcpProvider } from "../google/provider.js";
import { ingressIpAddress, zone } from "../shared/google/dns.js";
import { provider } from "../shared/kubernetes/provider.js";
import { debitorPortalApp } from "./debitor-portal-app/debitor-portal-app.js";
import { namespace } from "./namespace.js";
import { portalApi } from "./portal-api/portal-api.js";
import { portalApp } from "./portal-app/portal-app.js";
import { onboardingApp } from "./onboarding/onboarding-app.js";
import { restApiApp } from "./api/api.js";

customers.apply((customers) => {
  const customersWithProducts = customers.filter(
    (c) =>
      c.creditorPortalEnabled ||
      c.debitorPortalEnabled ||
      c.onboardingAppEnabled,
  );
  for (const customer of customersWithProducts) {
    const hasCustomDomain = Boolean(customer.domain?.trim());

    if (!hasCustomDomain) {
      // We need to create DNS records for the customer's subdomains under the root domain zone
      if (customer.creditorPortalEnabled) {
        new gcp.dns.RecordSet(
          `${customer.ident.current}-creditor-portal`,
          {
            managedZone: zone.name,
            name: customer.creditorPortalDomain,
            type: "A",
            ttl: 300,
            rrdatas: [ingressIpAddress],
          },
          { provider: gcpProvider },
        );
      }

      if (customer.debitorPortalEnabled) {
        new gcp.dns.RecordSet(
          `${customer.ident.current}-debitor-portal`,
          {
            managedZone: zone.name,
            name: customer.debitorPortalDomain + ".",
            type: "A",
            ttl: 300,
            rrdatas: [ingressIpAddress],
          },
          { provider: gcpProvider },
        );
      }

      if (customer.portalApiEnabled) {
        new gcp.dns.RecordSet(
          `${customer.ident.current}-api`,
          {
            managedZone: zone.name,
            name: customer.apiDomain + ".",
            type: "A",
            ttl: 300,
            rrdatas: [ingressIpAddress],
          },
          { provider: gcpProvider },
        );
      }

      if (customer.onboardingAppEnabled) {
        new gcp.dns.RecordSet(
          `${customer.ident.current}-onboarding-app`,
          {
            managedZone: zone.name,
            name: customer.onboardingAppDomain,
            type: "A",
            ttl: 300,
            rrdatas: [ingressIpAddress],
          },
          { provider: gcpProvider },
        );
      }

      if (customer.restApiEnabled) {
        new gcp.dns.RecordSet(
          `${customer.ident.current}-rest-api`,
          {
            managedZone: zone.name,
            name: customer.restApiDomain + ".",
            type: "A",
            ttl: 300,
            rrdatas: [ingressIpAddress],
          },
          { provider: gcpProvider },
        );
      }
    }

    const rules: k8s.types.input.networking.v1.IngressRule[] = [];

    if (customer.creditorPortalEnabled) {
      rules.push({
        host: customer.creditorPortalDomain,
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: {
                service: {
                  name: portalApp.service.metadata.name,
                  port: { number: portalApp.port },
                },
              },
            },
          ],
        },
      });
    }

    if (customer.debitorPortalEnabled) {
      rules.push({
        host: customer.debitorPortalDomain,
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: {
                service: {
                  name: debitorPortalApp.service.metadata.name,
                  port: { number: debitorPortalApp.port },
                },
              },
            },
          ],
        },
      });
    }

    if (customer.portalApiEnabled) {
      rules.push({
        host: customer.apiDomain,
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: {
                service: {
                  name: portalApi.service.metadata.name,
                  port: { number: portalApi.port },
                },
              },
            },
          ],
        },
      });
    }

    if (customer.onboardingAppEnabled) {
      rules.push({
        host: customer.onboardingAppDomain,
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: {
                service: {
                  name: onboardingApp.service.metadata.name,
                  port: { number: onboardingApp.port },
                },
              },
            },
          ],
        },
      });
    }

    if (customer.restApiEnabled) {
      rules.push({
        host: customer.restApiDomain,
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: {
                service: {
                  name: restApiApp.service.metadata.name,
                  port: { number: restApiApp.port },
                },
              },
            },
          ],
        },
      });
    }

    new k8s.networking.v1.Ingress(
      `${customer.ident.current}-ingress`,
      {
        metadata: {
          name: `customer-${customer.ident.current}`,
          namespace: namespace.metadata.name,
          annotations: {
            "kubernetes.io/ingress.class": "caddy",

            "pulumi.com/skipAwait": "true",
          },
          labels: {
            customer: customer.ident.current,
            kind: "customer-domain",
          },
        },
        spec: {
          rules,
        },
      },

      { provider },
    );
  }
});
