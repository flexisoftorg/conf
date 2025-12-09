import * as pulumi from '@pulumi/pulumi';
import {createClient} from '@sanity/client';
import {z} from 'zod';
import {rootDomain, sanityApiToken, sanityProjectId} from './shared/config.js';
import {notEmpty} from './utils.js';

const portalCustomer = z
	.object({
		ident: z.object({
			current: z.string(),
		}),
		host: z.string(),
		name: z.string(),
		port: z.number(),
		database: z.string(),
		domain: z.string().nullable(),
		logoUrl: z.string().nullable(),
		organizationNumber: z.string().nullish(),
		phoneNumber: z.string().nullish(),
		email: z.string().nullish(),
		address: z.string().nullish(),
		description: z.string().nullish(),
		merchantId: z.string().nullish(),
		merchantApiKey: z.string().nullish(),
		paymentProviderEnabled: z
			.boolean()
			.nullish()
			.transform((value) => value ?? false),
		debitorPortalEnabled: z
			.boolean()
			.nullish()
			.transform((value) => value ?? false),
		onboardingAppEnabled: z
			.boolean()
			.nullish()
			.transform((value) => value ?? false),
		creditorPortalEnabled: z
			.boolean()
			.nullish()
			.transform((value) => value ?? false),
		allowIndividualCustomers: z
			.boolean()
			.nullish()
			.transform((value) => value ?? false),
	})
	.transform((customer) => {
		const cleanRootDomain = rootDomain.slice(0, -1);

		const domain =
			customer.domain ?? `${customer.ident.current}.${cleanRootDomain}`;

		const hasCustomDomain = Boolean(customer.domain?.trim());

		const debitorPortalDomain = hasCustomDomain ? `debitor.${domain}` : domain;
		const creditorPortalDomain = hasCustomDomain ? domain : `kred.${domain}`;
		const apiDomain = `api.${domain}`;
		const restApiDomain = `rest.${domain}`;
		const onboardingAppDomain = `onboarding.${domain}`;
		return {
			...customer,
			hasCustomDomain,
			domain,
			debitorPortalDomain,
			creditorPortalDomain,
			onboardingAppDomain,
			apiDomain,
			restApiDomain,
			restApiEnabled:
				customer.creditorPortalEnabled ?? customer.debitorPortalEnabled,
			portalApiEnabled:
				customer.creditorPortalEnabled ?? customer.debitorPortalEnabled,
		};
	});

export type PortalCustomer = z.infer<typeof portalCustomer>;

export function getCustomers(): pulumi.Output<PortalCustomer[]> {
	return sanityApiToken.apply(async (token) => {
		const client = createClient({
			projectId: sanityProjectId,
			dataset: 'production',
			useCdn: false,
			token,
			apiVersion: '2023-04-18',
		});

		const result = await client.fetch<unknown[]>(`
      *[_type == 'customer' && !(_id in path('drafts.**'))] {
          ident {
            current
          },
          host,
          name,
          port,
          database,
          domain,
          "logoUrl": logo.asset->url,
          organizationNumber,
          phoneNumber,
          email,
          address,
          description,
          merchantId,
          merchantApiKey,
          paymentProviderEnabled,
          debitorPortalEnabled,
          onboardingAppEnabled,
          creditorPortalEnabled,
          allowIndividualCustomers
      }
    `);
		const customers = result
			.map((rawCustomer) => {
				const customer = portalCustomer.safeParse(rawCustomer);
				if (!customer.success) {
					const {ident} = rawCustomer as {
						ident: {current: string};
					};
					void pulumi.log.warn(
						`Customer could not be added due to data not adhering to correct data structure. (${
							ident.current ?? 'Unknown ID'
						})`,
					);

					return undefined;
				}

				pulumi.secret(customer.data.host);

				return customer.data;
			})
			.filter((c) => notEmpty(c));
		return customers;
	});
}

export const customers = getCustomers();
