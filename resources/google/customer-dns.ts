import * as gcp from '@pulumi/gcp';
import {customers} from '../get-customers.js';
import {ingressIpAddress, zone} from '../shared/google/dns.js';
import {provider as gcpProvider} from './provider.js';

customers.apply(customers => {
	for (const customer of customers) {
		if (!customer.hasCustomDomain) {
			// We need to create DNS records for the customer's subdomains under the root domain zone
			if (customer.creditorPortalEnabled) {
				new gcp.dns.RecordSet(
					`${customer.ident.current}-creditor-portal`,
					{
						managedZone: zone.name,
						name: customer.creditorPortalDomain + '.',
						type: 'A',
						ttl: 300,
						rrdatas: [ingressIpAddress],
					},
					{provider: gcpProvider},
				);
			}

			if (customer.debitorPortalEnabled) {
				new gcp.dns.RecordSet(
					`${customer.ident.current}-debitor-portal`,
					{
						managedZone: zone.name,
						name: customer.debitorPortalDomain + '.',
						type: 'A',
						ttl: 300,
						rrdatas: [ingressIpAddress],
					},
					{provider: gcpProvider},
				);
			}

			if (customer.portalApiEnabled) {
				new gcp.dns.RecordSet(
					`${customer.ident.current}-api`,
					{
						managedZone: zone.name,
						name: customer.apiDomain + '.',
						type: 'A',
						ttl: 300,
						rrdatas: [ingressIpAddress],
					},
					{provider: gcpProvider},
				);
			}

			if (customer.onboardingAppEnabled) {
				new gcp.dns.RecordSet(
					`${customer.ident.current}-onboarding-app`,
					{
						managedZone: zone.name,
						name: customer.onboardingAppDomain + '.',
						type: 'A',
						ttl: 300,
						rrdatas: [ingressIpAddress],
					},
					{provider: gcpProvider},
				);
			}

			if (customer.restApiEnabled) {
				new gcp.dns.RecordSet(
					`${customer.ident.current}-rest-api`,
					{
						managedZone: zone.name,
						name: customer.restApiDomain + '.',
						type: 'A',
						ttl: 300,
						rrdatas: [ingressIpAddress],
					},
					{provider: gcpProvider},
				);
			}
		}
	}
});
