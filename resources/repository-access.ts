import * as gcp from '@pulumi/gcp';
import { GitHubAccess } from './components/github-access';
import { provider as githubProvider } from './github/provider';
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

new GitHubAccess(
  'portal-api',
  {
    identityPoolName: identityPool.name,
    identityPoolProviderName: identityPoolProvider.name,
    repositories: ['portal-api'],
  },
  { providers: [googleProvider, githubProvider] },
);
