import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { provider } from '../../shared/kubernetes/provider';
import { namespace } from '../namespace';

const config = new pulumi.Config('debitor-portal-app');
const paymentProviderUrl = config.require('paymentProviderUrl');

export const debitorPaymentProvider = new k8s.core.v1.Secret(
    'debitor-portal-payment-provider',
    {
      metadata: {
        name: 'debitor-portal-payment-provider',
        namespace: namespace.metadata.name,
      },
      stringData: {
        PAYMENT_PROVIDER_URL: paymentProviderUrl,
      },
    },
    { provider },
  );
  