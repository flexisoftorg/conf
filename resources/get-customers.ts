import * as pulumi from '@pulumi/pulumi';
import { createClient } from '@sanity/client';
import { z } from 'zod';
import { sanityApiToken, sanityProjectId } from './shared/config.js';
import { notEmpty } from './utils.js';

const portalCustomer = z.object({
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
  paymentProviderEnabled: z.boolean().nullish(),
  debitorPortalEnabled: z.boolean().nullish(),
});

export type PortalCustomer = z.infer<typeof portalCustomer>;

export function getCustomers(): pulumi.Output<PortalCustomer[]> {
  return sanityApiToken.apply(async token => {
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
          debitorPortalEnabled
      }
    `);
    const customers = result
      .map(rawCustomer => {
        const customer = portalCustomer.safeParse(rawCustomer);
        if (!customer.success) {
          const { ident } = rawCustomer as { ident: { current: string } };
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
      .filter(notEmpty);
    return customers;
  });
}

export const customers = getCustomers();
