import * as k8s from '@pulumi/kubernetes';
import { provider } from '../../shared/kubernetes/provider';

const name = 'portal-api';

export const namespace = new k8s.core.v1.Namespace(
  name,
  {
    metadata: {
      name,
    },
  },
  { provider },
);
