import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import { GitHubAccess } from './components/github-access';
import { provider as githubProvider } from './github/provider';
import { repository } from './google/artifact-registry';
import { identityPool, identityPoolProvider } from './google/identity-pool';
import { provider as googleProvider } from './google/provider';

/**
 * This file is used to give GitHub Action in repositories access
 * to the Google Cloud Platform.
 *
 * Due to security concerns, we don't want to reuse the same service account
 * for all repositories. Instead, we create a new service account for each
 * repository (or group of repositories).
 */

const portalApiAccess = new GitHubAccess(
  'portal-api',
  {
    identityPoolName: identityPool.name,
    identityPoolProviderName: identityPoolProvider.name,
    repositories: ['portal-api'],
  },
  { providers: [googleProvider, githubProvider] },
);

new gcp.artifactregistry.RepositoryIamMember(
  'portal-api-artifact-registry-access',
  {
    repository: repository.id,
    member: pulumi.interpolate`serviceAccount:${portalApiAccess.serviceAccount.email}`,
    role: 'roles/artifactregistry.writer',
  },
  { provider: googleProvider },
);
