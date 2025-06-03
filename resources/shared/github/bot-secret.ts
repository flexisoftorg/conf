import * as github from '@pulumi/github';
import { owner, token } from '../../github/config.js';
import { provider } from '../../github/provider.js';

const allRepositories = github.getRepositories(
  {
    query: `org:${owner}`,
  },
  { provider },
);

// eslint-disable-next-line @typescript-eslint/no-floating-promises, unicorn/prefer-top-level-await
allRepositories.then(({ names }) => {
  names.forEach(repository => {
    new github.ActionsSecret(
      `bot-secret-${repository}`,
      {
        repository,
        secretName: 'BOT_GITHUB_TOKEN',
        plaintextValue: token,
      },
      { provider },
    );
  });
});
