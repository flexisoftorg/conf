import * as gcp from "@pulumi/gcp";
import {
	registrationAppDomain,
	altinnAuthAppDomain,
	signozDomain,
} from "../../config.js";
import { apiServices } from "../../google/api-services.js";
import { provider } from "../../google/provider.js";
import { rootDomain, studioSubDomain } from "../config.js";
import { ingressIpAddress } from "../kubernetes/config.js";

/**
 * DNS records for production zone
 *
 * Only genuinely platform-wide hosts live here. Anything that has to resolve a
 * tenant from the request host — the creditor/debitor portals, the portal API,
 * the REST API, onboarding, auth — is served at `<service>.<ident>.fpx.no` and
 * gets its record from `resources/google/customer-dns.ts` instead.
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
	"altinn-auth-app-a",
	{
		managedZone: zone.name,
		name: altinnAuthAppDomain,
		type: "A",
		ttl: 300,
		rrdatas: [ingressIpAddress],
	},
	{ provider },
);

new gcp.dns.RecordSet(
	"signoz-a",
	{
		managedZone: zone.name,
		name: signozDomain,
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

new gcp.dns.RecordSet(
	"customer-cname-target",
	{
		managedZone: zone.name,
		name: `ingress.${rootDomain}`,
		type: "A",
		ttl: 300,
		rrdatas: [ingressIpAddress],
	},
	{ provider },
);

new gcp.dns.RecordSet(
	"github-pages-dns-verification-studio",
	{
		managedZone: zone.name,
		name: "_github-pages-challenge-flexisoftorg.studio.fpx.no.",
		type: "TXT",
		ttl: 300,
		rrdatas: ["c579be18552eb74b572245d591770d"],
	},
	{ provider },
);
