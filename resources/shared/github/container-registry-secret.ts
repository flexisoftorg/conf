import * as github from '@pulumi/github';
import {provider} from '../../github/provider.js';
import {artifactRepoUrl} from '../google/artifact-registry.js';

const repositoriesWithArtifacts = [
	'api',
	'portal-api',
	'portal-app',
	'debitor-portal-app',
	'registration-app',
	'onboarding-app',
];

for (const repository of repositoriesWithArtifacts) {
	new github.ActionsSecret(
		`${repository}-artifact-secret`,
		{
			repository,
			secretName: 'CONTAINER_REGISTRY',
			plaintextValue: artifactRepoUrl,
		},
		{provider, aliases: [{name: 'artifact-secret'}]},
	);
}
