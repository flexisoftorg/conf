import * as pulumi from '@pulumi/pulumi';
import { createClient } from '@sanity/client';
import { z } from 'zod';
import { sanityApiToken, sanityProjectId } from './shared/config';

const portalCustomer = z.object({
  ident: z.object({
    current: z.string(),
  }),
  host: z.string(),
  name: z.string(),
  port: z.number(),
  database: z.string(),
  domain: z.string(),
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

    const result = await client.fetch(
      `
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
      `,
    );
    return z.array(portalCustomer).parse(result);
  });
}

export const customers = getCustomers();
