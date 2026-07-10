import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { redis } from "../portal-api/redis.js";
import { tenantsConfigMap, tenantsMountPath } from "../tenants-config-map.js";

const config = new pulumi.Config("auth-app");
const environment = pulumi.getStack();

const labels = { app: "auth-app", environment };

export const authAppPort = 3000;

// The session cookie is signed with the same secret go-api uses, so a
// `flexi-portal-session` minted here verifies there. Sourced from the shared
// portal-api config rather than a duplicate value.
const cookieSecret = new pulumi.Config("portal-api").requireSecret(
	"cookie-secret",
);

// Signs the opaque OAuth refresh tokens / authorization codes, guards the
// legacy /session store, and signs the JWT access tokens.
const clientSecret = config.requireSecret("client-secret");
const oauthGlobalSecret = config.requireSecret("oauth-global-secret");
const jwtSigningKey = config.requireSecret("jwt-signing-key");
// Optional JWKS `kid` override; derived from the key when unset.
const jwtKeyId = config.get("jwt-key-id");

export const authAppEnvSecrets = new k8s.core.v1.Secret(
	"auth-app-env-secrets",
	{
		metadata: {
			name: "auth-app-env-secrets",
			namespace: namespace.metadata.name,
		},
		stringData: {
			COOKIE_SECRET: cookieSecret,
			CLIENT_SECRET: clientSecret,
			OAUTH_GLOBAL_SECRET: oauthGlobalSecret,
			JWT_SIGNING_KEY: jwtSigningKey,
		},
	},
	{ provider: kubernetesProvider },
);

// Shared Redis instance (same one go-api reads): the Flexi session written
// here under `session:<id>` is recovered there to open Firebird.
const redisUrl = interpolate`${redis.service.metadata.name}.${redis.service.metadata.namespace}.svc.cluster.local:6379`;

export const authAppDeployment = new k8s.apps.v1.Deployment(
	"auth-app",
	{
		metadata: {
			name: "auth-app",
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
							name: "auth-app",
							image: interpolate`${artifactRepoUrl}/auth-app:${config.require("tag")}`,
							imagePullPolicy: "IfNotPresent",
							ports: [{ containerPort: authAppPort }],
							envFrom: [
								{ secretRef: { name: authAppEnvSecrets.metadata.name } },
							],
							env: [
								{ name: "PORT", value: String(authAppPort) },
								{ name: "LOG_LEVEL", value: config.get("log-level") ?? "info" },
								{ name: "APP_ENV", value: "production" },
								{ name: "REDIS_URL", value: redisUrl },
								// Per-tenant source, one JSON file per tenant. The loader
								// prefers this over the CUSTOMERS env var.
								{ name: "TENANTS_DIR", value: tenantsMountPath },
								...(jwtKeyId ? [{ name: "JWT_KEY_ID", value: jwtKeyId }] : []),
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
									port: authAppPort,
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

export const authAppService = new k8s.core.v1.Service(
	"auth-app",
	{
		metadata: {
			name: "auth-app",
			namespace: namespace.metadata.name,
			labels: { environment },
		},
		spec: {
			ports: [{ port: authAppPort }],
			selector: labels,
		},
	},
	{ provider: kubernetesProvider, deleteBeforeReplace: true },
);
