import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { provider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";

const config = new pulumi.Config("onboarding-app");

const user = config.requireSecret("database-user");
const password = config.requireSecret("database-password");

export const onboardingAppDatabaseCredentials = new k8s.core.v1.Secret(
	"onboarding-app-database-credentials",
	{
		metadata: {
			name: "onboarding-app-database-credentials",
			namespace: namespace.metadata.name,
		},
		stringData: {
			DATABASE_USER: user,
			DATABASE_PASSWORD: password,
		},
	},
	{ provider },
);
