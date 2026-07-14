import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";
import { interpolate } from "@pulumi/pulumi";
import { DeploymentComponent } from "../../components/deployment.js";
import { restApiDomain } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { registrationAppSanityCredentials } from "../registration-app/sanity-credentials.js";
import { redis } from "../portal-api/redis.js";
import { customers } from "../../get-customers.js";
import { rootDomain } from "../../shared/config.js";
import { tenantsConfigMap, tenantsMountPath } from "../tenants-config-map.js";

const config = new pulumi.Config("api");

export const debitorPortalAppApiKey = config.requireSecret(
	"debitor-portal-app-api-key",
);
const cleanApiDomain = restApiDomain.slice(0, -1);

export const fullApiDomain = interpolate`https://${cleanApiDomain}`;

const portalApiConfig = new pulumi.Config("portal-api");
const cookieSecret = portalApiConfig.requireSecret("cookie-secret");

const debitorPortalAppConfig = new pulumi.Config("debitor-portal-app");
const user = debitorPortalAppConfig.requireSecret("database-user");
const password = debitorPortalAppConfig.requireSecret("database-password");

const cleanRootDomain = rootDomain.slice(0, -1);

/** Comma-separated list of allowed origins, e.g. `"fpx.no, example.com, kvasir.no"` */
const allowedOrigins = customers.apply((customers) => {
	const customDomains = customers
		.filter((c) => c.domain !== "")
		.map((c) => c.domain.trim());
	return [cleanRootDomain, ...customDomains].join(", ");
});

export const apiEnvSecrets = new kubernetes.core.v1.Secret(
	"api-env-secrets",
	{
		metadata: {
			name: "api-env-secrets",
			namespace: namespace.metadata.name,
		},
		stringData: {
			COOKIE_SECRET: cookieSecret,
			DEBITOR_PORTAL_APP_USERNAME: user,
			DEBITOR_PORTAL_APP_PASSWORD: password,
			DEBITOR_PORTAL_APP_API_KEY: debitorPortalAppApiKey,
		},
	},
	{ provider: kubernetesProvider },
);

export const restApiApp = new DeploymentComponent(
	"api",
	{
		image: interpolate`${artifactRepoUrl}/api`,
		tag: config.require("tag"),
		host: cleanApiDomain,
		namespace: namespace.metadata.name,
		envFrom: [
			{ secretRef: { name: apiEnvSecrets.metadata.name } },
			{
				secretRef: {
					name: registrationAppSanityCredentials.metadata.name,
				},
			},
		],
		env: [
			// Without this the app defaults to development mode, which keeps the
			// dev-tenant fallback active and makes the MCP endpoint advertise the
			// localhost OAuth defaults instead of deriving the auth server per
			// tenant. Matches the auth-app deployment.
			{
				name: "APP_ENV",
				value: "production",
			},
			{
				name: "REDIS_URL",
				value: interpolate`${redis.service.metadata.name}.${redis.service.metadata.namespace}.svc.cluster.local:6379`,
			},
			{
				name: "SELF_URL",
				value: fullApiDomain,
			},
			{
				name: "ALLOWED_ORIGINS",
				value: allowedOrigins,
			},
			// Tenant source for the in-memory store. The loader reads every
			// `*.json` under this dir; the volume mount below populates it
			// from the shared `tenants` ConfigMap. go-api exits on an empty
			// store, so this must resolve to a non-empty directory.
			{
				name: "TENANTS_DIR",
				value: tenantsMountPath,
			},
		],
		volumeMounts: [
			{
				name: "tenants",
				mountPath: tenantsMountPath,
				readOnly: true,
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
		port: 8000,
		resources: {
			requests: {
				cpu: "250m",
				memory: "512Mi",
			},
			limits: {
				cpu: "250m",
				memory: "512Mi",
			},
		},
	},
	{ provider: kubernetesProvider },
);
