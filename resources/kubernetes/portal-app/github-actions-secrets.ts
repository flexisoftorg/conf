import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { provider } from "../../github/provider.js";
import { owner, token } from "../../github/config.js";
import { pbkdf2Sync } from "node:crypto";

const config = new pulumi.Config("portal-app");

const repository = config.require("repository");
const salt = config.requireSecret("next-server-actions-encryption-salt");
const seed = config.requireSecret("next-server-actions-encryption-seed");

function generateKey(salt: string, seed: string): string {
	// Derive a 32-byte (256-bit) AES key from the seed using PBKDF2
	const key = pbkdf2Sync(seed, salt, 100_000, 32, "sha256");
	// Return base64-encoded string
	return key.toString("base64");
}

new github.ActionsSecret(
	`portal-app-next-server-actions-signing-secret`,
	{
		repository: `${owner}/${repository}`,
		secretName: "GOOGLE_PROJECT_ID",
		plaintextValue: generateKey(salt, seed),
	},
	{
		provider,
		parent: this,
		deleteBeforeReplace: true,
	},
);
