import { Buffer } from "node:buffer";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { dockerConfigJson } from "../shared/google/artifact-puller.js";
import { provider } from "../shared/kubernetes/provider.js";
import { namespace } from "./namespace.js";

const name = "artifact-registry";

const ghcrName = "ghcr";

/**
 * Images are pushed to GHCR alongside Artifact Registry ahead of moving off
 * Google's registry.
 *
 * This needs its own credential rather than the token the GitHub provider
 * uses: GHCR accepts only classic personal access tokens, and that one is
 * fine-grained, so it authenticates to the API but is refused by the registry.
 * `ghcr:token` is a classic PAT scoped to `read:packages` alone, on a machine
 * user.
 */
const ghcrConfig = new pulumi.Config("ghcr");
const ghcrUsername = ghcrConfig.require("username");

const ghcrDockerConfigJson = pulumi.secret(
	ghcrConfig.requireSecret("token").apply((value) =>
		JSON.stringify({
			auths: {
				"ghcr.io": {
					username: ghcrUsername,
					password: value,
					auth: Buffer.from(`${ghcrUsername}:${value}`).toString("base64"),
				},
			},
		}),
	),
);

/**
 * A Secret cannot be read across namespaces, so every namespace running our
 * images needs its own copy of both.
 *
 * `resourceSuffix` only distinguishes the Pulumi resources — the Secrets
 * themselves are named identically everywhere, which is what lets the single
 * `imagePullSecrets` list below apply in any namespace. The platform's own
 * pair passes no suffix so that its resource names, and therefore its state,
 * are untouched by this being made reusable.
 */
export function createImagePullSecrets(
	namespaceName: pulumi.Input<string>,
	resourceSuffix = "",
): void {
	new k8s.core.v1.Secret(
		`${name}${resourceSuffix}`,
		{
			metadata: {
				name,
				namespace: namespaceName,
			},
			type: "kubernetes.io/dockerconfigjson",
			stringData: {
				".dockerconfigjson": dockerConfigJson,
			},
		},
		{ provider },
	);

	new k8s.core.v1.Secret(
		`${ghcrName}${resourceSuffix}`,
		{
			metadata: {
				name: ghcrName,
				namespace: namespaceName,
			},
			type: "kubernetes.io/dockerconfigjson",
			stringData: {
				".dockerconfigjson": ghcrDockerConfigJson,
			},
		},
		{ provider },
	);
}

createImagePullSecrets(namespace.metadata.name);

/**
 * Both registries are offered. Kubelet tries each until one succeeds, so this
 * keeps pulls working either side of the cutover without a flag day.
 *
 * Referenced by literal name rather than through `metadata.name`. Changing a
 * Secret's data replaces it, and an Output reference would drag every
 * Deployment into that replacement — a rebuild of the whole platform to rotate
 * one credential.
 */
export const imagePullSecrets = [{ name }, { name: ghcrName }];
