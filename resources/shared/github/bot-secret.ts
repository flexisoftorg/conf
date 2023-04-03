import * as github from '@pulumi/github';
import { owner, token } from '../../github/config';
import { provider } from '../../github/provider';

const allRepositories = github.getRepositories(
  {
    query: `org:${owner}`,
  },
  { provider },
);

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
