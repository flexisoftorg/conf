import * as pulumi from '@pulumi/pulumi';
import { createClient } from '@sanity/client';
import { z } from 'zod';
import { sanityApiToken, sanityProjectId } from './shared/config';
import { notEmpty } from './utils';

const portalCustomer = z.object({
  ident: z.object({
    current: z.string(),
  }),
  host: z.string(),
  name: z.string(),
  port: z.number(),
  database: z.string(),
  domain: z.string().optional(),
  logoUrl: z.string().nullable(),
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
          "logoUrl": logo.asset->url
      }
    `);
    const customers = result
      .map(rawCustomer => {
        const customer = portalCustomer.safeParse(rawCustomer);
        if (!customer.success) {
          const { ident } = rawCustomer as { ident: { current: string } };
          pulumi.log.warn(
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
