import * as gcp from "@pulumi/gcp";
import { apiServices } from "../../google/api-services.js";
import { provider } from "../../google/provider.js";
import { ipAddress } from "./ip-address.js";

const ingressIpAddress = ipAddress.address;

// Legacy DNS records, to be deleted as they are only used by older tenants
// who have their own DNS records poiting to bjerk.dev

const legacyZone = new gcp.dns.ManagedZone(
  "main-zone",
  {
    name: "main-zone",
    dnsName: "flexisoft.bjerk.dev.",
    description: "Main zone",
  },
  {
    provider,
    dependsOn: apiServices,
    ignoreChanges: ["entity.managedZone.id"],
  },
);

new gcp.dns.RecordSet(
  "portal-app-ipv4",
  {
    managedZone: legacyZone.name,
    name: "flexisoft.bjerk.dev.",
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "debitor-portal-app-ipv4",
  {
    managedZone: legacyZone.name,
    name: "debitor.flexisoft.bjerk.dev.",
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "portal-api",
  {
    managedZone: legacyZone.name,
    name: "api.flexisoft.bjerk.dev.",
    type: "A",
    ttl: 300,
    rrdatas: [ingressIpAddress],
  },
  { provider },
);

new gcp.dns.RecordSet(
  "studio",
  {
    managedZone: legacyZone.name,
    name: "studio.flexisoft.bjerk.dev.",
    type: "CNAME",
    ttl: 300,
    rrdatas: ["flexisoftorg.github.io."],
  },
  { provider },
);
