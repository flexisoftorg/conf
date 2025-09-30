import * as gcp from "@pulumi/gcp";
import {
  restApiDomain,
  debitorPortalAppDomain,
  portalAppDomain,
  registrationAppDomain,
} from "../../config.js";
import { apiServices } from "../../google/api-services.js";
import { provider } from "../../google/provider.js";
import { portalApiDomain } from "../../kubernetes/portal-api/portal-api.js";
import { rootDomain, studioSubDomain } from "../config.js";
import { ipAddress } from "./ip-address.js";

export const ingressIpAddress = ipAddress.address;

/**
 * DNS records for production zone
 */

export const zone = new gcp.dns.ManagedZone(
  "root-zone",
  {
    name: "root-zone",
    dnsName: rootDomain,
    description: "DNS zone for root domain for production use",
  },
  {
    provider,
    dependsOn: apiServices,
    ignoreChanges: ["entity.managedZone.id"],
  },
);

new gcp.dns.RecordSet(
  "main-a",
  {
    managedZone: zone.name,
    name: rootDomain,
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "portal-app-a",
  {
    managedZone: zone.name,
    name: portalAppDomain,
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);
new gcp.dns.RecordSet(
  "debitor-portal-app-a",
  {
    managedZone: zone.name,
    name: debitorPortalAppDomain,
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "portal-api-a",
  {
    managedZone: zone.name,
    name: portalApiDomain,
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "studio-a",
  {
    managedZone: zone.name,
    name: studioSubDomain,
    type: "CNAME",
    ttl: 300,
    rrdatas: ["flexisoftorg.github.io."],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "registration-app-a",
  {
    managedZone: zone.name,
    name: registrationAppDomain,
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "api-a",
  {
    managedZone: zone.name,
    name: restApiDomain,
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "new-gcp-project-dns-verification",
  {
    managedZone: zone.name,
    name: rootDomain,
    type: "TXT",
    ttl: 300,
    rrdatas: [
      "google-site-verification=XD87NUY2f0BtPhaK4O_Qg6yCy9ou5mPMKeeqnXbJNss",
    ],
  },
  { provider },
);
