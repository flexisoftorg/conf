import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { portalAppDomain } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { customers } from "../../get-customers.js";

const config = new pulumi.Config("portal-app");
const goConfig = new pulumi.Config("portal-app-go");

const agGridLicenseKey = config.requireSecret("ag-grid-license-key");

const environment = pulumi.getStack();
const cleanPortalAppDomain = portalAppDomain.slice(0, -1);

// ============================================================================
// portal-app (React/Next.js - legacy)
// ============================================================================

export const portalAppEnvSecrets = new k8s.core.v1.Secret(
	"portal-app-env-secrets",
	{
		metadata: {
			name: "portal-app-env-secrets",
			namespace: namespace.metadata.name,
		},
		stringData: {
			NEXT_PUBLIC_AG_GRID_LICENSE_KEY: agGridLicenseKey,
		},
	},
	{ provider: kubernetesProvider },
);

const portalAppLabels = { app: "portal-app", environment };

export const portalAppDeployment = new k8s.apps.v1.Deployment(
	"portal-app",
	{
		metadata: {
			name: "portal-app",
			namespace: namespace.metadata.name,
			labels: { environment },
			annotations: {
				"pulumi.com/skipAwait": "true",
			},
		},
		spec: {
			replicas: 1,
			selector: { matchLabels: portalAppLabels },
			template: {
				metadata: { labels: portalAppLabels },
				spec: {
					containers: [
						{
							name: "portal-app",
							image: interpolate`${artifactRepoUrl}/portal-app:${config.require("tag")}`,
							imagePullPolicy: "IfNotPresent",
							ports: [{ containerPort: 8000 }],
							envFrom: [
								{
									secretRef: {
										name: portalAppEnvSecrets.metadata.name,
									},
								},
							],
							env: [
								{ name: "PORT", value: "8000" },
								{ name: "LOG_LEVEL", value: "info" },
								{
									name: "CUSTOMERS",
									value: customers.apply((customers) =>
										JSON.stringify(
											customers.filter(
												(customer) => customer.creditorPortalEnabled,
											),
										),
									),
								},
							],
							resources: {
								requests: { cpu: "250m", memory: "512Mi" },
								limits: { cpu: "250m", memory: "512Mi" },
							},
							readinessProbe: {
								httpGet: { path: "/health", port: 8000, scheme: "HTTP" },
								initialDelaySeconds: 5,
								failureThreshold: 1,
							},
						},
					],
				},
			},
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);

export const portalAppPort = 8000;

export const portalAppService = new k8s.core.v1.Service(
	"portal-app",
	{
		metadata: {
			name: "portal-app",
			namespace: namespace.metadata.name,
			labels: { environment },
		},
		spec: {
			ports: [{ port: portalAppPort }],
			selector: portalAppLabels,
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);

// ============================================================================
// portal-app-go (HTMX/Go - new)
// ============================================================================

const portalAppGoLabels = { app: "portal-app-go", environment };

export const portalAppGoDeployment = new k8s.apps.v1.Deployment(
	"portal-app-go",
	{
		metadata: {
			name: "portal-app-go",
			namespace: namespace.metadata.name,
			labels: { environment },
			annotations: {
				"pulumi.com/skipAwait": "true",
			},
		},
		spec: {
			replicas: 1,
			selector: { matchLabels: portalAppGoLabels },
			template: {
				metadata: { labels: portalAppGoLabels },
				spec: {
					containers: [
						{
							name: "portal-app-go",
							image: interpolate`${artifactRepoUrl}/portal-app-go:${goConfig.require("tag")}`,
							imagePullPolicy: "IfNotPresent",
							ports: [{ containerPort: 8000 }],
							env: [
								{ name: "PORT", value: "8000" },
								{ name: "LOG_LEVEL", value: "info" },
								{
									name: "CUSTOMERS",
									value: customers.apply((customers) =>
										JSON.stringify(
											customers.filter(
												(customer) => customer.creditorPortalEnabled,
											),
										),
									),
								},
							],
							resources: {
								requests: { cpu: "100m", memory: "128Mi" },
								limits: { cpu: "250m", memory: "256Mi" },
							},
							readinessProbe: {
								httpGet: { path: "/health", port: 8000, scheme: "HTTP" },
								initialDelaySeconds: 5,
								failureThreshold: 1,
							},
						},
					],
				},
			},
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);

export const portalAppGoPort = 8000;

export const portalAppGoService = new k8s.core.v1.Service(
	"portal-app-go",
	{
		metadata: {
			name: "portal-app-go",
			namespace: namespace.metadata.name,
			labels: { environment },
		},
		spec: {
			ports: [{ port: portalAppGoPort }],
			selector: portalAppGoLabels,
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);

// ============================================================================
// Shared Ingress with path-based routing
// ============================================================================

// Define which paths should be routed to the new Go app.
// Add paths here as you migrate features from React to Go.
export const goAppPaths = ["/about"];

// Build ingress rules: specific paths go to Go app, everything else to React app
const ingressPaths: k8s.types.input.networking.v1.HTTPIngressPath[] = [
	// Routes for the new Go app (specific paths)
	...goAppPaths.map((path) => ({
		path,
		pathType: "Prefix" as const,
		backend: {
			service: {
				name: portalAppGoService.metadata.name,
				port: { number: 8000 },
			},
		},
	})),
	// Catch-all route for the React app (must be last)
	{
		path: "/",
		pathType: "Prefix",
		backend: {
			service: {
				name: portalAppService.metadata.name,
				port: { number: 8000 },
			},
		},
	},
];

export const portalAppIngress = new k8s.networking.v1.Ingress(
	"portal-app-ingress",
	{
		metadata: {
			name: "portal-app",
			namespace: namespace.metadata.name,
			labels: { environment },
			annotations: {
				"kubernetes.io/ingress.class": "caddy",
			},
		},
		spec: {
			rules: [
				{
					host: cleanPortalAppDomain,
					http: {
						paths: ingressPaths,
					},
				},
			],
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);
