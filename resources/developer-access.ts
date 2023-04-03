import * as gcp from '@pulumi/gcp';
import { developers } from './config';
import { repository } from './google/artifact-registry';
import { provider } from './google/provider';

/**
 * This file is used to give developers access to resources in Google Cloud Platform.
 *
 * We don't want to give developers access to all resources, so we have to
 * explicitly give them access to the resources they need.
 */

developers.map(
  developer =>
    // Gives developers access to deploy to the main artifact registry.
    new gcp.artifactregistry.RepositoryIamMember(
      `main-artifact-iam-${developer}`,
      {
        repository: repository.id,
        member: developer,
        role: 'roles/artifactregistry.writer',
      },
      { provider, deleteBeforeReplace: true },
    ),
);
