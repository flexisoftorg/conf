import * as github from '@pulumi/github';
import { provider } from './provider';

new github.ActionsEnvironmentSecret('artifact-secret', {
  
});