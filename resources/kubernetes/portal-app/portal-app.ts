import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { DeploymentComponent } from "../../components/deployment.js";
import { portalAppDomain } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { customers } from "../../get-customers.js";

const config = new pulumi.Config("portal-app");

const agGridLicenseKey = config.requireSecret("ag-grid-license-key");

export const portalAppEnvSecrets = new kubernetes.core.v1.Secret(
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

const cleanPortalAppDomain = portalAppDomain.slice(0, -1);

export const portalApp = new DeploymentComponent(
	"portal-app",
	{
		image: interpolate`${artifactRepoUrl}/portal-app`,
		tag: config.require("tag"),
		host: cleanPortalAppDomain,
		namespace: namespace.metadata.name,
		port: 8000,
		envFrom: [
			{
				secretRef: {
					name: portalAppEnvSecrets.metadata.name,
				},
			},
		],
		env: [
			{
				name: "CUSTOMERS",
				value: customers.apply((customers) =>
					JSON.stringify(
						customers.filter((customer) => customer.creditorPortalEnabled),
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
