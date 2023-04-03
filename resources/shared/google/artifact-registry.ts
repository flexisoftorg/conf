import * as gcp from '@pulumi/gcp';
import { interpolate } from '@pulumi/pulumi';
import { environment } from '../../config';
import { apiServices } from '../../google/api-services';
import { project, region } from '../../google/config';
import { provider } from '../../google/provider';

export const repository = new gcp.artifactregistry.Repository(
  'main-artifact-registry',
  {
    repositoryId: project,
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
