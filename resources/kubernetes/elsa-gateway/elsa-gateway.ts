import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { environment } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider } from "../../shared/kubernetes/provider.js";
import { GarageBucket } from "../garage/bucket.js";
import { imagePullSecrets } from "../image-pull-secret.js";
import { namespace } from "../namespace.js";

/**
 * ELSA Gateway delivers claims to Skatteetaten's SIMS endpoint and collects
 * their replies. It is a batch job: it runs, drains the queue, and exits.
 *
 * SIMS only answers requests coming from the NAT gateway in the `infra-sims`
 * project, which advertises Skatteetaten's network (192.68.83.0/24) onto the
 * tailnet. The tailscale sidecar below joins that tailnet and offers an HTTP
 * proxy on 127.0.0.1:1055; `SIMS_PROXY` points the SOAP client at it. Nothing
 * else in the job goes through the tailnet.
 */

const name = "elsa-gateway";
const config = new pulumi.Config(name);

const certificateMountPath = "/etc/elsa-gateway";
const proxyAddress = "127.0.0.1:1055";
const tailscaleTag = "tag:elsa-gateway";

/** The virksomhetssertifikat SIMS authenticates us with, certificate and key in one PEM. */
const certificate = new k8s.core.v1.Secret(
	`${name}-certificate`,
	{
		metadata: {
			name: `${name}-certificate`,
			namespace: namespace.metadata.name,
		},
		stringData: {
			"certificate.pem": config.requireSecret("certificate"),
		},
	},
	{ provider },
);

/**
 * Debug storage keeps the attachments of a message until it is delivered, so a
 * rejected one can be inspected. It is optional: with no bucket configured the
 * job simply doesn't record anything.
 */
const debugBucket = config.get("debug-bucket");

if (debugBucket) {
	new GarageBucket(name, {
		bucket: debugBucket,
		keyName: name,
		accessKeyId: config.requireSecret("s3-access-key-id"),
		secretAccessKey: config.requireSecret("s3-secret-access-key"),
		// Mirrors the GCS bucket this replaced, which expired objects at 30
		// days. Its two other rules reaped noncurrent versions; Garage has no
		// versioning, so the equivalent leftovers are stale multipart uploads.
		lifecycleRules: [
			{
				ID: "expire-after-30-days",
				Status: "Enabled",
				Filter: { Prefix: "" },
				Expiration: { Days: 30 },
			},
			{
				ID: "abort-incomplete-multipart-uploads",
				Status: "Enabled",
				Filter: { Prefix: "" },
				AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
			},
		],
	});
}

const credentials = new k8s.core.v1.Secret(
	`${name}-credentials`,
	{
		metadata: {
			name: `${name}-credentials`,
			namespace: namespace.metadata.name,
		},
		stringData: {
			FLEXISOFT_DB_HOST: config.requireSecret("database-host"),
			FLEXISOFT_DB_NAME: config.requireSecret("database-name"),
			FLEXISOFT_DB_USER: config.requireSecret("database-user"),
			FLEXISOFT_DB_PASSWORD: config.requireSecret("database-password"),
			FLEXISOFT_DB_ROLE: config.requireSecret("database-role"),
			...(debugBucket
				? {
						DEBUG_S3_ACCESS_KEY_ID: config.requireSecret("s3-access-key-id"),
						DEBUG_S3_SECRET_ACCESS_KEY: config.requireSecret(
							"s3-secret-access-key",
						),
					}
				: {}),
		},
	},
	{ provider },
);

/**
 * An OAuth client rather than an auth key: auth keys expire after at most 90
 * days, and this job has to keep running unattended. The client needs the
 * `auth_keys` scope and the `tag:elsa-gateway` tag; the keys it mints are
 * ephemeral, so each run's node disappears when the job finishes.
 */
const tailscaleCredentials = new k8s.core.v1.Secret(
	`${name}-tailscale`,
	{
		metadata: {
			name: `${name}-tailscale`,
			namespace: namespace.metadata.name,
		},
		stringData: {
			TS_CLIENT_ID: config.requireSecret("tailscale-client-id"),
			TS_CLIENT_SECRET: config.requireSecret("tailscale-client-secret"),
		},
	},
	{ provider },
);

const debugEnvironment: Array<pulumi.Input<k8s.types.input.core.v1.EnvVar>> =
	debugBucket
		? [
				{ name: "DEBUG_BUCKET", value: debugBucket },
				{ name: "DEBUG_S3_ENDPOINT", value: config.require("s3-endpoint") },
				{ name: "DEBUG_S3_REGION", value: config.get("s3-region") ?? "garage" },
			]
		: [];

export const elsaGateway = new k8s.batch.v1.CronJob(
	name,
	{
		metadata: {
			name,
			namespace: namespace.metadata.name,
			labels: { environment },
		},
		spec: {
			schedule: config.get("schedule") ?? "*/15 * * * *",
			// A run that overlaps the next one would deliver the same messages
			// twice, so a slow run skips the following tick instead.
			concurrencyPolicy: "Forbid",
			startingDeadlineSeconds: 300,
			successfulJobsHistoryLimit: 3,
			failedJobsHistoryLimit: 3,
			jobTemplate: {
				spec: {
					// The next tick is the retry; retrying immediately would only
					// hammer SIMS while it is unhappy.
					backoffLimit: 0,
					activeDeadlineSeconds: 3000,
					template: {
						metadata: {
							labels: { app: name, environment },
						},
						spec: {
							restartPolicy: "Never",
							imagePullSecrets,
							securityContext: {
								seccompProfile: { type: "RuntimeDefault" },
							},
							// A sidecar, not a plain init container: `restartPolicy:
							// Always` here means kubelet starts it first, waits for its
							// startup probe, and tears it down once the job container
							// exits.
							initContainers: [
								{
									name: "tailscale",
									image: "ghcr.io/tailscale/tailscale:v1.102.2",
									restartPolicy: "Always",
									env: [
										{ name: "TS_HOSTNAME", value: name },
										{ name: "TS_USERSPACE", value: "true" },
										{
											name: "TS_OUTBOUND_HTTP_PROXY_LISTEN",
											value: proxyAddress,
										},
										{
											name: "TS_EXTRA_ARGS",
											value: `--advertise-tags=${tailscaleTag} --accept-routes`,
										},
										// State lives and dies with the pod; every run is a
										// new ephemeral node.
										{ name: "TS_KUBE_SECRET", value: "" },
										{ name: "TS_STATE_DIR", value: "/tmp/tailscale" },
										{ name: "TS_ENABLE_HEALTH_CHECK", value: "true" },
										{ name: "TS_LOCAL_ADDR_PORT", value: "0.0.0.0:9002" },
									],
									envFrom: [
										{
											secretRef: {
												name: tailscaleCredentials.metadata.name,
											},
										},
									],
									startupProbe: {
										httpGet: { path: "/healthz", port: 9002 },
										periodSeconds: 2,
										failureThreshold: 60,
									},
									volumeMounts: [
										{ name: "tailscale-state", mountPath: "/tmp/tailscale" },
									],
									// Userspace networking needs no privileges at all.
									securityContext: {
										allowPrivilegeEscalation: false,
										capabilities: { drop: ["ALL"] },
									},
									resources: {
										requests: { cpu: "50m", memory: "64Mi" },
										limits: { cpu: "500m", memory: "128Mi" },
									},
								},
							],
							containers: [
								{
									name,
									image: interpolate`${artifactRepoUrl}/${name}:${config.require("tag")}`,
									imagePullPolicy: "IfNotPresent",
									env: [
										{
											name: "LOG_LEVEL",
											value: config.get("log-level") ?? "info",
										},
										{ name: "SIMS_URL", value: config.require("sims-url") },
										{
											name: "SIMS_CUSTOMER_ID",
											value: config.require("sims-customer-id"),
										},
										{
											name: "SIMS_CERT_FILE",
											value: `${certificateMountPath}/certificate.pem`,
										},
										{ name: "SIMS_PROXY", value: `http://${proxyAddress}` },
										{
											name: "FLEXISOFT_DB_PORT",
											value: config.get("database-port") ?? "3050",
										},
										...debugEnvironment,
									],
									envFrom: [{ secretRef: { name: credentials.metadata.name } }],
									volumeMounts: [
										{
											name: "certificate",
											mountPath: certificateMountPath,
											readOnly: true,
										},
									],
									securityContext: {
										allowPrivilegeEscalation: false,
										readOnlyRootFilesystem: true,
										runAsNonRoot: true,
										capabilities: { drop: ["ALL"] },
									},
									resources: {
										requests: { cpu: "100m", memory: "256Mi" },
										limits: { cpu: "1", memory: "512Mi" },
									},
								},
							],
							volumes: [
								{ name: "tailscale-state", emptyDir: {} },
								{
									name: "certificate",
									secret: { secretName: certificate.metadata.name },
								},
							],
						},
					},
				},
			},
		},
	},
	{ provider },
);
