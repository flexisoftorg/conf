import * as k8s from "@pulumi/kubernetes";
import { customers } from "../get-customers.js";
import {
	clusterIssuer,
	ingressClassName,
} from "../shared/kubernetes/config.js";
import { provider } from "../shared/kubernetes/provider.js";
import {
	cleanRootDomain,
	customerWildcardSecretName,
	rootWildcardSecretName,
} from "./certificates.js";
import { debitorPortalApp } from "./debitor-portal-app/debitor-portal-app.js";
import { namespace } from "./namespace.js";
import { portalApi } from "./portal-api/portal-api.js";
import {
	portalAppService,
	portalAppPort,
	portalAppGoService,
	portalAppGoPort,
	goAppPaths,
} from "./portal-app/portal-app.js";
import {
	portalAppSvelteService,
	portalAppSveltePort,
	svelteAppPaths,
} from "./portal-app-svelte/portal-app-svelte.js";
import { onboardingApp } from "./onboarding/onboarding-app.js";
import { restApiApp } from "./api/api.js";
import { authAppService, authAppPort } from "./auth-app/auth-app.js";

customers.apply((customers) => {
	for (const customer of customers) {
		const rules: k8s.types.input.networking.v1.IngressRule[] = [];
		const hostsBySecret = new Map<string, string[]>();

		const ident = customer.ident.current;

		// Tenants on our root domain are covered by wildcards issued in
		// certificates.ts: `*.<ident>.fpx.no` for their own subdomains, and the
		// shared `*.fpx.no` for their `<ident>.fpx.no` debitor portal. Tenants on
		// their own domain fall back to a per-host certificate, since DNS-01 needs
		// a zone we control.
		const secretForHost = (kind: string, host: string) => {
			if (customer.hasCustomDomain) {
				return `${ident}-${kind}-tls`;
			}

			return host.endsWith(`.${ident}.${cleanRootDomain}`)
				? customerWildcardSecretName(ident)
				: rootWildcardSecretName;
		};

		const addHost = (
			kind: string,
			host: string,
			paths: k8s.types.input.networking.v1.HTTPIngressPath[],
		) => {
			rules.push({ host, http: { paths } });

			const secretName = secretForHost(kind, host);
			const hosts = hostsBySecret.get(secretName) ?? [];
			hosts.push(host);
			hostsBySecret.set(secretName, hosts);
		};

		if (customer.creditorPortalEnabled) {
			addHost("creditor-portal", customer.creditorPortalDomain, [
				// Routes for the SvelteKit rewrite (specific paths).
				// Populated incrementally as pages migrate; see
				// `svelteAppPaths` in portal-app-svelte.ts.
				...svelteAppPaths.map((path) => ({
					path,
					pathType: "Prefix" as const,
					backend: {
						service: {
							name: portalAppSvelteService.metadata.name,
							port: {
								number: portalAppSveltePort,
							},
						},
					},
				})),
				// Routes for the (deprecated) Go app (specific paths).
				...goAppPaths.map((path) => ({
					path,
					pathType: "Prefix" as const,
					backend: {
						service: {
							name: portalAppGoService.metadata.name,
							port: {
								number: portalAppGoPort,
							},
						},
					},
				})),
				// Catch-all route for the React app
				{
					path: "/",
					pathType: "Prefix",
					backend: {
						service: {
							name: portalAppService.metadata.name,
							port: {
								number: portalAppPort,
							},
						},
					},
				},
			]);
		}

		if (customer.debitorPortalEnabled) {
			addHost("debitor-portal", customer.debitorPortalDomain, [
				{
					path: "/",
					pathType: "Prefix",
					backend: {
						service: {
							name: debitorPortalApp.service.metadata.name,
							port: {
								number: debitorPortalApp.port,
							},
						},
					},
				},
			]);
		}

		if (customer.portalApiEnabled) {
			addHost("api", customer.apiDomain, [
				{
					path: "/",
					pathType: "Prefix",
					backend: {
						service: {
							name: portalApi.service.metadata.name,
							port: {
								number: portalApi.port,
							},
						},
					},
				},
			]);
		}

		if (customer.onboardingAppEnabled) {
			addHost("onboarding-app", customer.onboardingAppDomain, [
				{
					path: "/",
					pathType: "Prefix",
					backend: {
						service: {
							name: onboardingApp.service.metadata.name,
							port: {
								number: onboardingApp.port,
							},
						},
					},
				},
			]);
		}

		if (customer.restApiEnabled) {
			addHost("rest-api", customer.restApiDomain, [
				{
					path: "/",
					pathType: "Prefix",
					backend: {
						service: {
							name: restApiApp.service.metadata.name,
							port: {
								number: restApiApp.port,
							},
						},
					},
				},
			]);
		}

		// Gate on the same flag as the auth-app DNS record (customer-dns.ts) and
		// the rest-api rule above. Adding an `auth.<domain>` host for a customer
		// with the feature disabled points the ingress at a name with no DNS
		// record, so its ACME challenge for that host fails — and enough such
		// failures rate-limit certificate issuance for the *enabled* auth hosts
		// too.
		if (customer.authAppEnabled) {
			addHost("auth-app", customer.authAppDomain, [
				{
					path: "/",
					pathType: "Prefix",
					backend: {
						service: {
							name: authAppService.metadata.name,
							port: {
								number: authAppPort,
							},
						},
					},
				},
			]);
		}

		new k8s.networking.v1.Ingress(
			`${customer.ident.current}-ingress`,
			{
				metadata: {
					name: `customer-${ident}`,
					namespace: namespace.metadata.name,
					annotations: {
						// Only custom-domain tenants let cert-manager's ingress-shim mint
						// certificates. Wildcard secrets are shared across Ingresses, so
						// leaving the annotation on would have several Ingresses each
						// claiming ownership of the same secret.
						...(customer.hasCustomDomain
							? { "cert-manager.io/cluster-issuer": clusterIssuer }
							: {}),

						"pulumi.com/skipAwait": "true",
					},
					labels: {
						customer: ident,
						kind: "customer-domain",
					},
				},
				spec: {
					ingressClassName,
					rules,
					tls: [...hostsBySecret].map(([secretName, hosts]) => ({
						hosts,
						secretName,
					})),
				},
			},

			{ provider },
		);
	}
});
