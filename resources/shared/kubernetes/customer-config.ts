import * as kubernetes from '@pulumi/kubernetes';
import { customers } from '../../get-customers';
import { provider as kubernetesProvider } from './provider';

export const customerConfigMap = new kubernetes.core.v1.ConfigMap(
  'customer-config-map',
  {
    metadata: {
      name: 'customer-config-map',
    },
    data: {
      CUSTOMERS: customers.apply(customers => JSON.stringify(customers)),
    },
  },
  { provider: kubernetesProvider },
);
