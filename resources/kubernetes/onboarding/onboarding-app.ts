import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { DeploymentComponent } from "../../components/deployment.js";
import { onboardingAppDomain } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { customers } from "../../get-customers.js";
import { onboardingAppDatabaseCredentials } from "./database-credentials.js";

const config = new pulumi.Config("onboarding-app");

const cleanOnboardingAppDomain = onboardingAppDomain.slice(0, -1);

export const onboardingApp = new DeploymentComponent(
	"onboarding-app",
	{
		image: interpolate`${artifactRepoUrl}/onboarding-app`,
		tag: config.require("tag"),
		host: cleanOnboardingAppDomain,
		namespace: namespace.metadata.name,
		port: 8000,
		envFrom: [
			{
				secretRef: {
					name: onboardingAppDatabaseCredentials.metadata.name,
				},
			},
		],
		env: [
			{
				name: "CUSTOMERS",
				value: customers.apply((customers) =>
					JSON.stringify(
						customers.filter((customer) => customer.onboardingAppEnabled),
					),
				),
			},
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
