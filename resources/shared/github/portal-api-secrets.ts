import * as github from '@pulumi/github';
import { provider } from '../../github/provider';
import { artifactRepoUrl } from '../google/artifact-registry';

new github.ActionsSecret(
  'artifact-secret',
  {
    repository: 'portal-api',
    secretName: 'CONTAINER_REGISTRY',
    plaintextValue: artifactRepoUrl,
  },
  { provider },
);
