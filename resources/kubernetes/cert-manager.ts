import * as k8s from "@pulumi/kubernetes";
import { project } from "../google/config.js";
import { dnsSolverKey } from "../shared/google/dns-solver.js";
import {
	clusterIssuer,
	ingressClassName,
	systemEmail,
} from "../shared/kubernetes/config.js";
import { provider } from "../shared/kubernetes/provider.js";

// Cert-manager itself is installed out of band; this only adds the DNS-01
// issuer it needs to mint wildcards.
const namespace = "cert-manager";

const solverSecret = new k8s.core.v1.Secret(
	"cert-manager-dns-solver",
	{
		metadata: {
			name: "cert-manager-dns-solver",
			namespace,
		},
		stringData: {
			"key.json": dnsSolverKey,
		},
	},
	{ provider },
);

/**
 * HTTP-01 issuer, used only for tenants on domains we don't host — their zone
 * isn't ours to write DNS-01 challenge records into.
 */
export const httpIssuer = new k8s.apiextensions.CustomResource(
	"letsencrypt-http-issuer",
	{
		apiVersion: "cert-manager.io/v1",
		kind: "ClusterIssuer",
		metadata: {
			name: clusterIssuer,
		},
		spec: {
			acme: {
				email: systemEmail,
				server: "https://acme-v02.api.letsencrypt.org/directory",
				privateKeySecretRef: {
					name: "letsencrypt-http-account-key",
				},
				solvers: [
					{
						http01: {
							ingress: {
								ingressClassName,
							},
						},
					},
				],
			},
		},
	},
	{ provider },
);

export const dnsClusterIssuer = "letsencrypt-dns";

export const dnsIssuer = new k8s.apiextensions.CustomResource(
	"letsencrypt-dns-issuer",
	{
		apiVersion: "cert-manager.io/v1",
		kind: "ClusterIssuer",
		metadata: {
			name: dnsClusterIssuer,
		},
		spec: {
			acme: {
				email: systemEmail,
				server: "https://acme-v02.api.letsencrypt.org/directory",
				privateKeySecretRef: {
					name: "letsencrypt-dns-account-key",
				},
				solvers: [
					{
						dns01: {
							cloudDNS: {
								project,
								serviceAccountSecretRef: {
									name: solverSecret.metadata.name,
									key: "key.json",
								},
							},
						},
					},
				],
			},
		},
	},
	{ provider },
);
