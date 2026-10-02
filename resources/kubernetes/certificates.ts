import * as k8s from "@pulumi/kubernetes";
import { customers } from "../get-customers.js";
import { rootDomain } from "../shared/config.js";
import { provider } from "../shared/kubernetes/provider.js";
import { dnsClusterIssuer, dnsIssuer } from "./cert-manager.js";
import { namespace } from "./namespace.js";

export const cleanRootDomain = rootDomain.slice(0, -1);

/**
 * One certificate for every host directly under the root domain — the platform
 * hosts (`reg.fpx.no`, `altinn.fpx.no`, …) and each tenant's debitor portal
 * (`<ident>.fpx.no`). A wildcard covers a single label, so tenant subdomains
 * two levels deep need their own certificate below.
 */
export const rootWildcardSecretName = "fpx-wildcard-tls";

new k8s.apiextensions.CustomResource(
	"fpx-wildcard-certificate",
	{
		apiVersion: "cert-manager.io/v1",
		kind: "Certificate",
		metadata: {
			name: "fpx-wildcard",
			namespace: namespace.metadata.name,
		},
		spec: {
			secretName: rootWildcardSecretName,
			issuerRef: {
				name: dnsClusterIssuer,
				kind: "ClusterIssuer",
			},
			dnsNames: [cleanRootDomain, `*.${cleanRootDomain}`],
		},
	},
	{ provider, dependsOn: [dnsIssuer] },
);

export const customerWildcardSecretName = (ident: string) =>
	`${ident}-wildcard-tls`;

customers.apply((customers) => {
	for (const customer of customers) {
		// Tenants on their own domain can't use DNS-01 — we don't control their
		// zone — so their hosts get per-host HTTP-01 certificates instead.
		if (customer.hasCustomDomain) {
			continue;
		}

		const ident = customer.ident.current;

		new k8s.apiextensions.CustomResource(
			`${ident}-wildcard-certificate`,
			{
				apiVersion: "cert-manager.io/v1",
				kind: "Certificate",
				metadata: {
					name: `${ident}-wildcard`,
					namespace: namespace.metadata.name,
				},
				spec: {
					secretName: customerWildcardSecretName(ident),
					issuerRef: {
						name: dnsClusterIssuer,
						kind: "ClusterIssuer",
					},
					dnsNames: [`*.${ident}.${cleanRootDomain}`],
				},
			},
			{ provider, dependsOn: [dnsIssuer] },
		);
	}
});
