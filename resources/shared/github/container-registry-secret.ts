import * as github from '@pulumi/github';
import { provider } from '../../github/provider';
import { artifactRepoUrl } from '../google/artifact-registry';

const repositoriesWithArtifacts = [
  'portal-api',
  'portal-app',
  'debitor-portal-app',
  'registration-app',
];

repositoriesWithArtifacts.forEach(repository => {
  new github.ActionsSecret(
    `${repository}-artifact-secret`,
    {
      repository,
      secretName: 'CONTAINER_REGISTRY',
      plaintextValue: artifactRepoUrl,
    },
    { provider, aliases: [{ name: 'artifact-secret' }] },
  );
});
