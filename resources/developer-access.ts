import * as gcp from '@pulumi/gcp';
import { developers } from './config.js';
import * as googleConfig from './google/config.js';
import { provider } from './google/provider.js';
import { repository } from './shared/google/artifact-registry.js';

/**
 * This file is used to give developers access to resources in Google Cloud Platform.
 *
 * We don't want to give developers access to all resources, so we have to
 * explicitly give them access to the resources they need.
 */

developers.map(member => [
  // Gives developers access to deploy to the main artifact registry.
  new gcp.artifactregistry.RepositoryIamMember(
    `main-artifact-iam-${member}`,
    {
      repository: repository.id,
      member,
      role: 'roles/artifactregistry.writer',
    },
    { provider, deleteBeforeReplace: true },
  ),
  // Gives developers access to the Kubernetes cluster
  new gcp.projects.IAMMember(
    `main-cluster-iam-${member}`,
    {
      project: googleConfig.project,
      member,
      role: 'roles/container.developer',
    },
    { provider, deleteBeforeReplace: true },
  ),
  new gcp.projects.IAMMember(
    `logs-viewer-iam-${member}`,
    {
      project: googleConfig.project,
      member,
      role: 'roles/logging.privateLogViewer',
    },
    { provider, deleteBeforeReplace: true },
  ),
]);
