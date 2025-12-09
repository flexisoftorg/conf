import * as k8s from "@pulumi/kubernetes";
import { ipAddress } from "../google/ip-address.js";
import { systemEmail } from "./config.js";
import { provider } from "./provider.js";

const namespace = new k8s.core.v1.Namespace(
	"caddy-system",
	{
		metadata: {
			name: "caddy-system",
		},
	},
	{ provider },
);

export const ingress = new k8s.helm.v3.Chart(
	"caddy-ingress",
	{
		chart: "caddy-ingress-controller",
		// Renovate: depName=caddy-ingress-controller packageName=caddy-ingress-controller registryUrl=https://caddyserver.github.io/ingress/
		version: "1.3.0",
		fetchOpts: {
			repo: "https://caddyserver.github.io/ingress/",
		},
		skipAwait: true,
		namespace: namespace.metadata.name,
		values: {
			ingressController: {
				config: {
					email: systemEmail,
				},
			},
			loadBalancer: {
				loadBalancerIp: ipAddress.address,
			},
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
	},
	{ provider },
);
