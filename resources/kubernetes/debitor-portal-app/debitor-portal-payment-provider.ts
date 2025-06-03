import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { provider } from '../../shared/kubernetes/provider.js';
import { namespace } from '../namespace.js';

const config = new pulumi.Config('debitor-portal-app');
const paymentProviderUrl = config.require('paymentProviderUrl');

export const debitorPaymentProvider = new k8s.core.v1.ConfigMap(
  'debitor-portal-payment-provider',
  {
    metadata: {
      namespace: namespace.metadata.name,
      annotations: {
        'pulumi.com/skipAwait': 'true',
      },
    },
    data: {
      PAYMENT_PROVIDER_URL: paymentProviderUrl,
    },
  },
  { provider },
);
