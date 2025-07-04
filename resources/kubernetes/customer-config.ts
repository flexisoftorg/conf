import * as kubernetes from "@pulumi/kubernetes";
import { customers } from "../get-customers.js";
import { rootDomain } from "../shared/config.js";
import { provider as kubernetesProvider } from "../shared/kubernetes/provider.js";
import { namespace } from "./namespace.js";
import { fullApiDomain } from "./api/api.js";

export const customerConfigMap = new kubernetes.core.v1.ConfigMap(
  "customer-config-map",
  {
    metadata: {
      namespace: namespace.metadata.name,
      annotations: {
        "pulumi.com/skipAwait": "true",
      },
    },
    data: {
      CUSTOMERS: customers.apply((customers) => {
        const customersWithDomain = customers.map((customer) => {
          const cleanRootDomain = rootDomain.slice(0, -1);

          const domain =
            customer.domain ?? `${customer.ident.current}.${cleanRootDomain}`;

          const hasCustomDomain = Boolean(customer.domain?.trim());

          const debitorPortalDomain = hasCustomDomain
            ? `debitor.${domain}`
            : domain;
          const creditorPortalDomain = hasCustomDomain
            ? domain
            : `kred.${domain}`;
          const apiDomain = `api.${domain}`;

          return {
            ...customer,
            domain,
            debitorPortalDomain,
            creditorPortalDomain,
            apiDomain,
          };
        });
        return JSON.stringify(customersWithDomain);
      }),
    },
  },
  { provider: kubernetesProvider },
);
