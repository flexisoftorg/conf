import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { GitHubAccess } from "./components/github-access.js";
import { provider as githubProvider } from "./github/provider.js";
import { identityPool, identityPoolProvider } from "./google/identity-pool.js";
import { provider as googleProvider } from "./google/provider.js";
import { repository } from "./shared/google/artifact-registry.js";

/**
 * This file is used to give GitHub Action in repositories access
 * to the Google Cloud Platform.
 *
 * Due to security concerns, we don't want to reuse the same service account
 * for all repositories. Instead, we create a new service account for each
 * repository (or group of repositories).
 */

const repositories = [
	"api",
	"portal-api",
	"portal-app",
	"debitor-portal-app",
	"registration-app",
	"onboarding-app",
	"portal-app-go",
	"altinn-auth-app",
];

for (const repositoryName of repositories) {
	const githubAccess = new GitHubAccess(
		repositoryName,
		{
			identityPoolName: identityPool.name,
			identityPoolProviderName: identityPoolProvider.name,
			repositories: [repositoryName],
		},
		{ providers: [googleProvider, githubProvider] },
	);

	new gcp.artifactregistry.RepositoryIamMember(
		`${repositoryName}-artifact-registry-access`,
		{
			repository: repository.id,
			member: pulumi.interpolate`serviceAccount:${githubAccess.serviceAccount.email}`,
			role: "roles/artifactregistry.writer",
		},
		{ provider: googleProvider },
	);
}
