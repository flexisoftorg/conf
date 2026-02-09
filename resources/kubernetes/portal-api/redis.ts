import { DeploymentComponent } from "../../components/deployment.js";
import { provider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";

export const redis = new DeploymentComponent(
	"redis",
	{
		image: "redis",
		tag: "6.2.11-alpine",
		env: [{ name: "MASTER", value: "true" }],
		namespace: namespace.metadata.name,
		port: 6379,
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
		readinessProbe: {
			exec: {
				command: ["redis-cli", "ping"],
			},
			initialDelaySeconds: 5,
			failureThreshold: 3,
		},
	},
	{ provider },
);
