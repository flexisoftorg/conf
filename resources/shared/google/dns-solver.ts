import { Buffer } from "node:buffer";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { project } from "../../google/config.js";
import { provider } from "../../google/provider.js";

/**
 * Wildcard certificates can only be validated over DNS-01, which means
 * cert-manager needs to write TXT records into the Cloud DNS zone itself.
 */
const account = new gcp.serviceaccount.Account(
	"cert-manager-dns",
	{
		accountId: "cert-manager-dns",
		displayName: "Solves ACME DNS-01 challenges in Cloud DNS",
	},
	{ provider },
);

new gcp.projects.IAMMember(
	"cert-manager-dns-admin",
	{
		project,
		role: "roles/dns.admin",
		member: interpolate`serviceAccount:${account.email}`,
	},
	{ provider },
);

const key = new gcp.serviceaccount.Key(
	"cert-manager-dns-key",
	{
		serviceAccountId: account.name,
	},
	{ provider },
);

export const dnsSolverKey = pulumi.secret(
	key.privateKey.apply((privateKey) =>
		Buffer.from(privateKey, "base64").toString("utf8"),
	),
);
