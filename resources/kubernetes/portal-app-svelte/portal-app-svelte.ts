import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { customers } from "../../get-customers.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { tenantsConfigMap, tenantsMountPath } from "../tenants-config-map.js";

const config = new pulumi.Config("portal-app-svelte");
const environment = pulumi.getStack();

const labels = { app: "portal-app-svelte", environment };

export const portalAppSveltePort = 3000;

export const portalAppSvelteDeployment = new k8s.apps.v1.Deployment(
	"portal-app-svelte",
	{
		metadata: {
			name: "portal-app-svelte",
			namespace: namespace.metadata.name,
			labels: { environment },
			annotations: {
				"pulumi.com/skipAwait": "true",
			},
		},
		spec: {
			replicas: 1,
			selector: { matchLabels: labels },
			template: {
				metadata: { labels },
				spec: {
					containers: [
						{
							name: "portal-app-svelte",
							image: interpolate`${artifactRepoUrl}/portal-app-svelte:${config.require("tag")}`,
							imagePullPolicy: "IfNotPresent",
							ports: [{ containerPort: portalAppSveltePort }],
							env: [
								{ name: "PORT", value: String(portalAppSveltePort) },
								{ name: "LOG_LEVEL", value: config.get("log-level") ?? "info" },
								{ name: "NODE_ENV", value: "production" },
								// New tenant source. Loader prefers this over CUSTOMERS.
								{ name: "TENANTS_DIR", value: tenantsMountPath },
								// Legacy fallback. Kept during the transition per
								// MIGRATION.md so this deployment also works if the
								// ConfigMap volume mount ever fails to materialize.
								{
									name: "CUSTOMERS",
									value: customers.apply((cs) =>
										JSON.stringify(cs.filter((c) => c.creditorPortalEnabled)),
									),
								},
							],
							volumeMounts: [
								{
									name: "tenants",
									mountPath: tenantsMountPath,
									readOnly: true,
								},
							],
							resources: {
								requests: { cpu: "250m", memory: "512Mi" },
								limits: { cpu: "250m", memory: "512Mi" },
							},
							readinessProbe: {
								httpGet: {
									path: "/health",
									port: portalAppSveltePort,
									scheme: "HTTP",
								},
								initialDelaySeconds: 60,
								periodSeconds: 10,
								failureThreshold: 5,
							},
						},
					],
					volumes: [
						{
							name: "tenants",
							configMap: {
								name: tenantsConfigMap.metadata.name,
							},
						},
					],
				},
			},
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);

export const portalAppSvelteService = new k8s.core.v1.Service(
	"portal-app-svelte",
	{
		metadata: {
			name: "portal-app-svelte",
			namespace: namespace.metadata.name,
			labels: { environment },
		},
		spec: {
			ports: [{ port: portalAppSveltePort }],
			selector: labels,
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);

// Path prefixes the SvelteKit app owns on the creditor portal domain.
// Routed in `ingress.ts` ahead of the React catch-all, identical pattern
// to `goAppPaths` in `portal-app/portal-app.ts`. Add a prefix here as
// each page is migrated from React/Go to SvelteKit; remove the matching
// entry from `goAppPaths` if it overlaps.
//
// Empty at Phase 0 — the deployment is reachable in-cluster but takes
// no public traffic until the first page is migrated.
export const svelteAppPaths: string[] = [
	"/hello",
	"/login-v2",
	"/globals.css",
	"/fonts.css",
	"/utils.css",
	"/_app",
];
