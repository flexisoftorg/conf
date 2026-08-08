import { Buffer } from "node:buffer";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { project, region } from "../../google/config.js";
import { provider } from "../../google/provider.js";
import { repository } from "./artifact-registry.js";

/**
 * GKE nodes pulled from Artifact Registry using the node's own Google identity.
 * The Talos cluster has no Google identity, so it needs an explicit
 * reader service account whose key is handed to kubelet as a pull secret.
 */
const account = new gcp.serviceaccount.Account(
	"artifact-puller",
	{
		accountId: "artifact-puller",
		displayName: "Pulls container images for the Kubernetes cluster",
	},
	{ provider },
);

new gcp.artifactregistry.RepositoryIamMember(
	"artifact-puller-reader",
	{
		project,
		location: repository.location,
		repository: repository.name,
		role: "roles/artifactregistry.reader",
		member: interpolate`serviceAccount:${account.email}`,
	},
	{ provider },
);

const key = new gcp.serviceaccount.Key(
	"artifact-puller-key",
	{
		serviceAccountId: account.name,
	},
	{ provider },
);

const registryHost = `${region}-docker.pkg.dev`;

export const dockerConfigJson = pulumi.secret(
	key.privateKey.apply((privateKey) => {
		// `privateKey` is the base64-encoded service account JSON; Artifact
		// Registry expects that JSON verbatim as the password for `_json_key`.
		const jsonKey = Buffer.from(privateKey, "base64").toString("utf8");

		return JSON.stringify({
			auths: {
				[registryHost]: {
					username: "_json_key",
					password: jsonKey,
					auth: Buffer.from(`_json_key:${jsonKey}`).toString("base64"),
				},
			},
		});
	}),
);
