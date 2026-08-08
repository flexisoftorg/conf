import * as k8s from "@pulumi/kubernetes";
import { dockerConfigJson } from "../shared/google/artifact-puller.js";
import { provider } from "../shared/kubernetes/provider.js";
import { namespace } from "./namespace.js";

const name = "artifact-registry";

export const imagePullSecret = new k8s.core.v1.Secret(
	name,
	{
		metadata: {
			name,
			namespace: namespace.metadata.name,
		},
		type: "kubernetes.io/dockerconfigjson",
		stringData: {
			".dockerconfigjson": dockerConfigJson,
		},
	},
	{ provider },
);

export const imagePullSecrets = [{ name: imagePullSecret.metadata.name }];
