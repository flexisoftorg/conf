import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { provider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";

const config = new pulumi.Config("altinn-auth-app");

export const altinnAuthAppSecrets = new k8s.core.v1.Secret(
	"altinn-auth-app-secrets",
	{
		metadata: {
			name: "altinn-auth-app-secrets",
			namespace: namespace.metadata.name,
		},
		stringData: {
			CLIENT_ID: config.requireSecret("client-id"),
			KEY_ID: config.requireSecret("key-id"),
			SECRET_KEY: config.requireSecret("secret-key"),
			CODE_SIGNING_SECRET: config.requireSecret("code-signing-secret"),
			SYSTEMBRUKER_SYSTEM_ID: config.requireSecret("systembruker-system-id"),
		},
	},
	{ provider },
);
