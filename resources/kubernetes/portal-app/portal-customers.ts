import * as kubernetes from "@pulumi/kubernetes";
import { customers } from "../../get-customers.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";

export const creditorPortalAppCustomerConfigMap =
  new kubernetes.core.v1.ConfigMap(
    "creditor-portal-app-customer-config-map",
    {
      metadata: {
        namespace: namespace.metadata.name,
        annotations: {
          "pulumi.com/skipAwait": "true",
        },
      },
      data: {
        CUSTOMERS: customers.apply((customers) =>
          JSON.stringify(
            customers.filter((customer) => customer.creditorPortalEnabled),
          ),
        ),
      },
    },
    { provider: kubernetesProvider },
  );
