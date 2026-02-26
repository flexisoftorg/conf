import { pbkdf2Sync } from "node:crypto";
import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { provider } from "../../github/provider.js";
import { owner } from "../../github/config.js";

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

pulumi.all([salt, seed]).apply(
	([resolvedSalt, resolvedSeed]) =>
		new github.ActionsSecret(
			`portal-app-next-server-actions-github-secret`,
			{
				repository,
				secretName: "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
				plaintextValue: generateKey(
					resolvedSalt as string,
					resolvedSeed as string,
				),
			},
			{
				provider,
				parent: this,
				deleteBeforeReplace: true,
			},
		),
);
