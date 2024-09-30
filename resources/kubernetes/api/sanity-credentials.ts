import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { namespace } from '../namespace';
import { sanityProjectId } from '../../shared/config';
import { provider } from '../../shared/kubernetes/provider';

const config = new pulumi.Config('api');

const sanityApiToken = config.requireSecret('sanity-api-token');

export const ApiSanityCredentials = new k8s.core.v1.Secret(
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
