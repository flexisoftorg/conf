import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { DeploymentComponent } from "../../components/deployment.js";
import { altinnAuthAppDomain } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";

const config = new pulumi.Config("altinn-auth-app");
const cleanAltinnAuthAppDomain = altinnAuthAppDomain.slice(0, -1);

const altinnAuthAppEnvSecrets = new k8s.core.v1.Secret(
	"altinn-auth-app-env-secrets",
	{
		metadata: {
			name: "altinn-auth-app-env-secrets",
			namespace: namespace.metadata.name,
		},
		stringData: {
			PRIVATE_KEY: config.requireSecret("secret-key"),
			CLIENT_ID: config.requireSecret("client-id"),
			KEY_ID: config.requireSecret("key-id"),
			CODE_SIGNING_SECRET: config.requireSecret("code-signing-secret"),
			SYSTEMBRUKER_SYSTEM_ID: config.requireSecret("systembruker-system-id"),
		},
	},
	{ provider: kubernetesProvider },
);

export const altinnAuthApp = new DeploymentComponent(
	"altinn-auth-app",
	{
		image: interpolate`${artifactRepoUrl}/altinn-auth-app`,
		tag: config.require("tag"),
		host: cleanAltinnAuthAppDomain,
		namespace: namespace.metadata.name,
		port: 8000,
		envFrom: [
			{
				secretRef: {
					name: altinnAuthAppEnvSecrets.metadata.name,
				},
			},
		],
		env: [
			{
				name: "SELF_URL",
				value: `https://${cleanAltinnAuthAppDomain}`,
			},
			{ name: "TOKEN_ENDPOINT", value: "https://test.maskinporten.no/token" },
			{
				name: "ALTINN_AUTH_BASE_URL",
				value: "https://platform.tt02.altinn.no/authentication/api/v1",
			},
			{ name: "AUDIENCE", value: "https://test.maskinporten.no/" },
		],
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
