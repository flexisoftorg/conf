import * as gcp from '@pulumi/gcp';
import { interpolate } from '@pulumi/pulumi';
import { environment } from '../config';
import { apiServices } from './api-services';
import { project, region } from './config';
import { provider } from './provider';

export const repository = new gcp.artifactregistry.Repository(
  'main-artifact-registry',
  {
    repositoryId: interpolate`${environment}-main`,
    location: region,
    format: 'DOCKER',
    description: 'Main artifact registry, used for most services.',
    labels: {
      environment,
    },
  },
  { provider, dependsOn: apiServices },
);

export const artifactRepoUrl = interpolate`${repository.location}-docker.pkg.dev/${project}/${repository.repositoryId}`;
