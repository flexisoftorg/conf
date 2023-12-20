import * as github from '@pulumi/github';
import { provider } from '../../github/provider';
import { artifactRepoUrl } from '../google/artifact-registry';

new github.ActionsSecret(
  'portal-api-artifact-secret',
  {
    repository: 'portal-api',
    secretName: 'CONTAINER_REGISTRY',
    plaintextValue: artifactRepoUrl,
  },
  { provider, aliases: [{ name: 'artifact-secret' }] },
);

new github.ActionsSecret(
  'portal-app-artifact-secret',
  {
    repository: 'portal-app',
    secretName: 'CONTAINER_REGISTRY',
    plaintextValue: artifactRepoUrl,
  },
  { provider },
);

new github.ActionsSecret(
  'debitor-portal-app-artifact-secret',
  {
    repository: 'debitor-portal-app',
    secretName: 'CONTAINER_REGISTRY',
    plaintextValue: artifactRepoUrl,
  },
  { provider },
);
