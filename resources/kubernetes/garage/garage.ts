import { Buffer } from "node:buffer";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { provider } from "../../shared/kubernetes/provider.js";

const config = new pulumi.Config("garage");

const name = "garage";

/**
 * S3-compatible object storage, declared directly rather than via Helm — the
 * only Garage charts published are third-party, and the deployment is a
 * StatefulSet and two services.
 *
 * Deliberately cluster-internal: ClusterIP only, no ingress, no `LoadBalancer`.
 * Note that flannel alone does not enforce NetworkPolicy, so "internal" here
 * means nothing routes to it from outside — not that in-cluster traffic is
 * restricted.
 */
export const namespace = new k8s.core.v1.Namespace(
	name,
	{
		metadata: {
			name,
		},
	},
	{ provider },
);

/**
 * Garage reads both of these from the environment, which keeps them out of the
 * config file and therefore out of the ConfigMap.
 */
export const secrets = new k8s.core.v1.Secret(
	`${name}-secrets`,
	{
		metadata: {
			name: `${name}-secrets`,
			namespace: namespace.metadata.name,
		},
		stringData: {
			GARAGE_RPC_SECRET: config.requireSecret("rpc-secret"),
			GARAGE_ADMIN_TOKEN: config.requireSecret("admin-token"),
		},
	},
	{ provider },
);

const dataSize = "200Gi";

/**
 * Single node, so replication_factor is 1 — Garage refuses to start if it is
 * asked to replicate wider than the cluster.
 */
const garageToml = `metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "lmdb"

replication_factor = 1

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "${name}-0.${name}-headless.${name}.svc.cluster.local:3901"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.${name}.internal"

[admin]
api_bind_addr = "[::]:3903"
`;

const configMap = new k8s.core.v1.ConfigMap(
	name,
	{
		metadata: {
			name,
			namespace: namespace.metadata.name,
		},
		data: {
			"garage.toml": garageToml,
		},
	},
	{ provider },
);

const labels = { app: name };

/**
 * Stable network identity is required: `rpc_public_addr` above refers to the
 * pod by its StatefulSet DNS name.
 */
export const headlessService = new k8s.core.v1.Service(
	`${name}-headless`,
	{
		metadata: {
			name: `${name}-headless`,
			namespace: namespace.metadata.name,
		},
		spec: {
			clusterIP: "None",
			selector: labels,
			ports: [{ name: "rpc", port: 3901, targetPort: 3901 }],
		},
	},
	{ provider },
);

export const service = new k8s.core.v1.Service(
	name,
	{
		metadata: {
			name,
			namespace: namespace.metadata.name,
		},
		spec: {
			type: "ClusterIP",
			selector: labels,
			ports: [
				{ name: "s3", port: 3900, targetPort: 3900 },
				{ name: "admin", port: 3903, targetPort: 3903 },
			],
		},
	},
	{ provider },
);

export const statefulSet = new k8s.apps.v1.StatefulSet(
	name,
	{
		metadata: {
			name,
			namespace: namespace.metadata.name,
		},
		spec: {
			serviceName: headlessService.metadata.name,
			replicas: 1,
			selector: { matchLabels: labels },
			template: {
				metadata: {
					labels,
					annotations: {
						// Roll the pod when the config changes; Garage only reads
						// garage.toml at startup.
						"checksum/config": configMap.data.apply((d) =>
							Buffer.from(d["garage.toml"]).toString("base64").slice(0, 32),
						),
						// Picked up by the k8s-infra Prometheus preset, which discovers
						// targets by annotation.
						"signoz.io/scrape": "true",
						"signoz.io/port": "3903",
						"signoz.io/path": "/metrics",
					},
				},
				spec: {
					containers: [
						{
							name,
							// Renovate: depName=dxflrs/garage
							image: "dxflrs/garage:v2.3.0",
							imagePullPolicy: "IfNotPresent",
							envFrom: [{ secretRef: { name: secrets.metadata.name } }],
							ports: [
								{ name: "s3", containerPort: 3900 },
								{ name: "rpc", containerPort: 3901 },
								{ name: "admin", containerPort: 3903 },
							],
							volumeMounts: [
								{
									name: "config",
									mountPath: "/etc/garage.toml",
									subPath: "garage.toml",
								},
								{ name: "meta", mountPath: "/var/lib/garage/meta" },
								{ name: "data", mountPath: "/var/lib/garage/data" },
							],
							resources: {
								requests: { cpu: "200m", memory: "512Mi" },
								limits: { cpu: "2", memory: "4Gi" },
							},
							readinessProbe: {
								httpGet: { path: "/health", port: 3903 },
								initialDelaySeconds: 10,
								periodSeconds: 10,
							},
						},
					],
					volumes: [
						{
							name: "config",
							configMap: { name: configMap.metadata.name },
						},
					],
				},
			},
			volumeClaimTemplates: [
				{
					metadata: { name: "meta" },
					spec: {
						accessModes: ["ReadWriteOnce"],
						resources: { requests: { storage: "10Gi" } },
					},
				},
				{
					metadata: { name: "data" },
					spec: {
						accessModes: ["ReadWriteOnce"],
						// The 200 GB cap. `local-path` cannot expand, so changing this
						// means recreating the volume.
						resources: { requests: { storage: dataSize } },
					},
				},
			],
		},
	},
	{ provider },
);
