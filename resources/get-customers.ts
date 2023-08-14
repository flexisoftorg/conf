import * as pulumi from '@pulumi/pulumi';
import { createClient } from '@sanity/client';
import { z } from 'zod';
import { sanityApiToken, sanityProjectId } from './shared/config';
import { notEmpty } from './utils';

const portalCustomer = z.object({
  host: z.string(),
  name: z.string(),
  port: z.number(),
  database: z.string(),
  slug: z.object({
    current: z.string(),
  }),
  domain: z.string().optional(),
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

    const result = await client.fetch<unknown[]>("*[_type == 'customer']");
    const customers = result
      .map(rawCustomer => {
        const customer = portalCustomer.safeParse(rawCustomer);
        if (!customer.success) {
          const { id } = rawCustomer as { id: string };
          pulumi.log.warn(
            `Customer could not be added due to data not adhering to correct data structure. (${
              id ?? 'Unknown ID'
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
