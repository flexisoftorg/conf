import * as kubernetes from '@pulumi/kubernetes';
import { customers } from '../get-customers';
import { rootDomain } from '../shared/config';
import { provider as kubernetesProvider } from '../shared/kubernetes/provider';
import { namespace } from './namespace';

export const customerConfigMap = new kubernetes.core.v1.ConfigMap(
  'customer-config-map',
  {
    metadata: {
      namespace: namespace.metadata.name,
      annotations: {
        'pulumi.com/skipAwait': 'true',
      },
    },
    data: {
      CUSTOMERS: customers.apply(customers => {
        const customersWithDomain = customers.map(customer => {
          if (customer.domain) {
            return customer;
          }

          const domain = `${customer.ident.current}.${rootDomain}`;

          return {
            ...customer,
            domain,
          };
        });
        return JSON.stringify(customersWithDomain);
      }),
    },
  },
  { provider: kubernetesProvider },
);
