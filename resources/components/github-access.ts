import * as gcp from '@pulumi/gcp';
import * as github from '@pulumi/github';
import * as pulumi from '@pulumi/pulumi';
import {interpolate} from '@pulumi/pulumi';
import {environment} from '../config.js';
import {owner} from '../github/config.js';
import {project} from '../google/config.js';

export type GitHubAccessArgs = {
	/**
	 * The name of the identity pool provider.
	 *
	 * Example: identityPoolProvider.name
	 */
	identityPoolProviderName: pulumi.Input<string>;

	/**
	 * The name of the identity pool.
	 *
	 * Example: identityPool.name
	 *
	 * @see https://www.pulumi.com/docs/reference/pkg/gcp/iam/workloadidentitypool/
	 */
	identityPoolName: pulumi.Input<string>;

	repositories: Array<pulumi.Input<string>>;
};

/**
 * Creates a service account and access to it from GitHub Actions.
 */
export class GitHubAccess extends pulumi.ComponentResource {
	public readonly serviceAccount: gcp.serviceaccount.Account;

	constructor(
		name: string,
		args: GitHubAccessArgs,
		options?: pulumi.ComponentResourceOptions,
	) {
		super('flexisoft:github:access', name, args, options);

		const {identityPoolName, identityPoolProviderName, repositories} = args;

		this.serviceAccount = new gcp.serviceaccount.Account(
			name,
			{
				accountId: interpolate`${environment}-${name}-github`,
				description: 'GitHub Actions Service Account, uses Workload Identity',
			},
			{parent: this},
		);

		for (const inputRepository of repositories) {
			pulumi.output(inputRepository).apply(async repository => {
				const repo = repository;
				new github.ActionsSecret(
					`${name}-google-projects-${owner}-${repo}`,
					{
						repository,
						secretName: 'GOOGLE_PROJECT_ID',
						plaintextValue: project,
					},
					{
						parent: this,
						deleteBeforeReplace: true,
					},
				);

				new github.ActionsSecret(
					`${name}-identity-provider-${owner}-${repo}`,
					{
						repository,
						secretName: 'GOOGLE_WORKLOAD_IDENTITY_PROVIDER',
						plaintextValue: identityPoolProviderName,
					},
					{
						parent: this,
						deleteBeforeReplace: true,
					},
				);

				new github.ActionsSecret(
					`${name}-service-account-${owner}-${repo}`,
					{
						repository,
						secretName: 'GOOGLE_SERVICE_ACCOUNT',
						plaintextValue: this.serviceAccount.email,
					},
					{
						parent: this,
						deleteBeforeReplace: true,
					},
				);

				new gcp.serviceaccount.IAMMember(
					`${name}-core-iam-service-${owner}-${repo}`,
					{
						serviceAccountId: this.serviceAccount.name,
						role: 'roles/iam.workloadIdentityUser',
						member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPoolName}/attribute.repository/${owner}/${repo}`,
					},
					{
						parent: this,
						deleteBeforeReplace: true,
					},
				);

				new gcp.serviceaccount.IAMMember(
					`${name}-core-iam-service-token-${owner}-${repo}`,
					{
						serviceAccountId: this.serviceAccount.name,
						role: 'roles/iam.serviceAccountTokenCreator',
						member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPoolName}/attribute.repository/${owner}/${repo}`,
					},
					{
						parent: this,
						deleteBeforeReplace: true,
					},
				);
			});
		}
	}
}
