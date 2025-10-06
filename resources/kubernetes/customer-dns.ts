import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import { customers } from "../get-customers.js";
import { provider as gcpProvider } from "../google/provider.js";
import { rootDomain } from "../shared/config.js";
import { ingressIpAddress, zone } from "../shared/google/dns.js";
import { provider } from "../shared/kubernetes/provider.js";
import { debitorPortalApp } from "./debitor-portal-app/debitor-portal-app.js";
import { namespace } from "./namespace.js";
import { portalApi } from "./portal-api/portal-api.js";
import { portalApp } from "./portal-app/portal-app.js";
import { onboardingApp } from "./onboarding/onboarding-app.js";

customers.apply((customers) => {
  const customersWithProducts = customers.filter(
    (c) =>
      c.creditorPortalEnabled ||
      c.debitorPortalEnabled ||
      c.onboardingAppEnabled,
  );
  for (const customer of customersWithProducts) {
    const domain = customer.domain
      ? `${customer.domain}.`
      : `${customer.ident.current}.${rootDomain}`;

    const hasCustomDomain = Boolean(customer.domain?.trim());

    const debitorPortalDomain = hasCustomDomain ? `debitor.${domain}` : domain;

    const creditorPortalDomain = hasCustomDomain ? domain : `kred.${domain}`;

    const apiEnabled =
      customer.creditorPortalEnabled || customer.debitorPortalEnabled;
    const apiDomain = `api.${domain}`;
    const onboardingAppDomain = `onboarding.${domain}`;

    if (!hasCustomDomain) {
      // We need to create DNS records for the customer's subdomains under the root domain zone
      if (customer.creditorPortalEnabled) {
        new gcp.dns.RecordSet(
          `${customer.ident.current}-creditor-portal`,
          {
            managedZone: zone.name,
            name: creditorPortalDomain,
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
            name: debitorPortalDomain,
            type: "A",
            ttl: 300,
            rrdatas: [ingressIpAddress],
          },
          { provider: gcpProvider },
        );
      }

      if (apiEnabled) {
        new gcp.dns.RecordSet(
          `${customer.ident.current}-api`,
          {
            managedZone: zone.name,
            name: apiDomain,
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
            name: onboardingAppDomain,
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
        host: creditorPortalDomain.slice(0, -1),
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
        host: debitorPortalDomain.slice(0, -1),
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

    if (apiEnabled) {
      rules.push({
        host: apiDomain.slice(0, -1),
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
        host: onboardingAppDomain.slice(0, -1),
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
