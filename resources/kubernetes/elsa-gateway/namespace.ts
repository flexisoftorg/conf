import * as k8s from "@pulumi/kubernetes";
import { provider } from "../../shared/kubernetes/provider.js";

/**
 * ELSA Gateway gets its own namespace rather than sharing `portal-prod`. It is
 * a batch job with its own credentials and its own network path — the only
 * workload here that reaches Skatteetaten — so the blast radius of a mistake
 * in its config stays with it.
 */
const name = "elsa-gateway";

export const namespace = new k8s.core.v1.Namespace(
	name,
	{
		metadata: {
			name,
			annotations: {
				"pulumi.com/skipAwait": "true",
			},
		},
	},
	{ provider },
);
