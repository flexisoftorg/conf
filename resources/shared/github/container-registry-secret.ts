import * as github from "@pulumi/github";
import { provider } from "../../github/provider.js";
import { artifactRepoUrl } from "../google/artifact-registry.js";

const repositoriesWithArtifacts = [
	"api",
	"portal-api",
	"portal-app",
	"portal-app-svelte",
	"debitor-portal-app",
	"registration-app",
	"onboarding-app",
	"portal-app-go",
	"altinn-auth-app",
	"auth-app",
];

for (const repository of repositoriesWithArtifacts) {
	new github.ActionsSecret(
		`${repository}-artifact-secret`,
		{
			repository,
			secretName: "CONTAINER_REGISTRY",
			plaintextValue: artifactRepoUrl,
		},
		{ provider, aliases: [{ name: "artifact-secret" }] },
	);
}
