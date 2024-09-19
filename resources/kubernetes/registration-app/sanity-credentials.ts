import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { namespace } from '../namespace';
import { provider } from '../../google/provider';
import { sanityProjectId } from '../../shared/config';

const config = new pulumi.Config('registration-app');

const sanityApiToken = config.requireSecret('sanity-api-token');

export const registrationAppSanityCredentials = new k8s.core.v1.Secret(
  'registration-app-sanity-credentials',
  {
    metadata: {
      name: 'registration-app-sanity-credentials',
      namespace: namespace.metadata.name,
    },
    stringData: {
      SANITY_API_TOKEN: sanityApiToken,
      SANITY_PROJECT_ID: sanityProjectId,
    },
  },
  { provider },
);
