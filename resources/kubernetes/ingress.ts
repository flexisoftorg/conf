import * as k8s from '@pulumi/kubernetes';
import {customers} from '../get-customers.js';
import {provider} from '../shared/kubernetes/provider.js';
import {debitorPortalApp} from './debitor-portal-app/debitor-portal-app.js';
import {namespace} from './namespace.js';
import {portalApi} from './portal-api/portal-api.js';
import {portalApp} from './portal-app/portal-app.js';
import {onboardingApp} from './onboarding/onboarding-app.js';
import {restApiApp} from './api/api.js';

customers.apply((customers) => {
	for (const customer of customers) {
		const rules: k8s.types.input.networking.v1.IngressRule[] = [];

		if (customer.creditorPortalEnabled) {
			rules.push({
				host: customer.creditorPortalDomain,
				http: {
					paths: [
						{
							path: '/',
							pathType: 'Prefix',
							backend: {
								service: {
									name: portalApp.service.metadata.name,
									port: {
										number: portalApp.port,
									},
								},
							},
						},
					],
				},
			});
		}

		if (customer.debitorPortalEnabled) {
			rules.push({
				host: customer.debitorPortalDomain,
				http: {
					paths: [
						{
							path: '/',
							pathType: 'Prefix',
							backend: {
								service: {
									name: debitorPortalApp.service.metadata.name,
									port: {
										number: debitorPortalApp.port,
									},
								},
							},
						},
					],
				},
			});
		}

		if (customer.portalApiEnabled) {
			rules.push({
				host: customer.apiDomain,
				http: {
					paths: [
						{
							path: '/',
							pathType: 'Prefix',
							backend: {
								service: {
									name: portalApi.service.metadata.name,
									port: {
										number: portalApi.port,
									},
								},
							},
						},
					],
				},
			});
		}

		if (customer.onboardingAppEnabled) {
			rules.push({
				host: customer.onboardingAppDomain,
				http: {
					paths: [
						{
							path: '/',
							pathType: 'Prefix',
							backend: {
								service: {
									name: onboardingApp.service.metadata.name,
									port: {
										number: onboardingApp.port,
									},
								},
							},
						},
					],
				},
			});
		}

		if (customer.restApiEnabled) {
			rules.push({
				host: customer.restApiDomain,
				http: {
					paths: [
						{
							path: '/',
							pathType: 'Prefix',
							backend: {
								service: {
									name: restApiApp.service.metadata.name,
									port: {
										number: restApiApp.port,
									},
								},
							},
						},
					],
				},
			});
		}

		new k8s.networking.v1.Ingress(
			`${customer.ident.current}-ingress`,
			{
				metadata: {
					name: `customer-${customer.ident.current}`,
					namespace: namespace.metadata.name,
					annotations: {
						'kubernetes.io/ingress.class': 'caddy',

						'pulumi.com/skipAwait': 'true',
					},
					labels: {
						customer: customer.ident.current,
						kind: 'customer-domain',
					},
				},
				spec: {
					rules,
				},
			},

			{provider},
		);
	}
});
