import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { provider } from '../../shared/kubernetes/provider';

const config = new pulumi.Config('debitor-portal-app');

const portalUsername = config.requireSecret('portalUsername');
const portalPassword = config.requireSecret('portalPassword');

export const debitorPortalCredentials = new k8s.core.v1.Secret(
  'debitor-portal-database-credentials',
  {
    metadata: {
      name: 'debitor-portal-database-credentials',
    },
    stringData: {
      PORTAL_USERNAME: portalUsername,
      PORTAL_PASSWORD: portalPassword,
    },
  },
  { provider },
);