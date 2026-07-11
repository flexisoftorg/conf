import * as kubernetes from "@pulumi/kubernetes";
import type * as pulumi from "@pulumi/pulumi";
import { customers } from "../get-customers.js";
import { provider as kubernetesProvider } from "../shared/kubernetes/provider.js";
import { namespace } from "./namespace.js";

/**
 * Per-tenant ConfigMap consumed by apps that have migrated off the
 * legacy `CUSTOMERS` env var (see `MIGRATION.md` § "Tenant
 * configuration").
 *
 * One file per tenant, plus an `_index.json` listing idents. Apps
 * mount the ConfigMap as a volume and read from
 * `/etc/flexisoft/tenants/`. Files starting with `_` are metadata
 * for tooling, not tenant data, and are skipped by the loaders.
 *
 * NOTE: the data shape matches today's `CUSTOMERS` element exactly,
 * which means secret-bearing fields like `merchantId` and
 * `merchantApiKey` ride along. That posture is unchanged from
 * what's already in cluster ConfigMaps today; lifting those into
 * a separate Secret is tracked as a follow-up.
 */
export const tenantsConfigMap = new kubernetes.core.v1.ConfigMap(
	"tenants",
	{
		metadata: {
			name: "tenants",
			namespace: namespace.metadata.name,
			annotations: {
				"pulumi.com/skipAwait": "true",
			},
		},
		data: customers.apply((cs) => {
			const data: Record<string, pulumi.Input<string>> = {
				"_index.json": JSON.stringify(cs.map((c) => c.ident.current)),
			};
			for (const c of cs) {
				data[`${c.ident.current}.json`] = JSON.stringify(c);
			}

			return data;
		}),
	},
	{ provider: kubernetesProvider },
);

/** Mount path used by every consuming app. Keep this in sync with the
 * `TENANTS_DIR` defaults in app source. */
export const tenantsMountPath = "/etc/flexisoft/tenants";
