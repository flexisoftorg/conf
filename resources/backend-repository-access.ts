import { GitHubAccess } from './components/github-access';
import { provider as githubProvider } from './github/provider';
import { identityPool, identityPoolProvider } from './google/identity-pool';
import { provider as googleProvider } from './google/provider';

new GitHubAccess(
  'portal-api',
  {
    identityPoolName: identityPool.name,
    identityPoolProviderName: identityPoolProvider.name,
    repositories: ['portal-api'],
  },
  { providers: [googleProvider, githubProvider] },
);
