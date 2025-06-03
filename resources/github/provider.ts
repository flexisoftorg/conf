import * as github from '@pulumi/github';
import { owner, token } from './config.js';

export const provider = new github.Provider('github', {
  token,
  owner,
});
