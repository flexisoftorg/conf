import * as kubernetes from '@pulumi/kubernetes';
import {customers} from '../get-customers.js';
import {provider as kubernetesProvider} from '../shared/kubernetes/provider.js';
import {namespace} from './namespace.js';

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
			CUSTOMERS: customers.apply((customers) => JSON.stringify(customers)),
		},
	},
	{provider: kubernetesProvider},
);
