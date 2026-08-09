import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { provider } from "../../shared/kubernetes/provider.js";
import { namespace, secrets, service, statefulSet } from "./garage.js";

/**
 * Garage has no Pulumi or Terraform provider, and `pulumi up` runs off-cluster
 * while Garage is ClusterIP-only — so nothing outside the cluster can reach its
 * API to reconcile a bucket. This runs the reconciliation inside the cluster
 * instead, as a Job against Garage's admin API.
 *
 * The script is idempotent, which is what makes a Job an acceptable stand-in
 * for a resource: re-running it converges rather than fails. Kubernetes will
 * not let a Job's pod template be edited, so Pulumi replaces the Job whenever
 * any input below changes, and the replacement re-runs the script.
 */

/** An S3 lifecycle rule, as Garage's admin API accepts it. */
export type LifecycleRule = {
	ID: string;
	Status: "Enabled" | "Disabled";
	Filter: { Prefix: string };
	Expiration?: { Days: number };
	AbortIncompleteMultipartUpload?: { DaysAfterInitiation: number };
};

export type GarageBucketArgs = {
	/** Global alias for the bucket, e.g. `elsa-gateway-debug`. */
	bucket: pulumi.Input<string>;

	/** Access key ID, `GK` followed by 24 hex characters. */
	accessKeyId: pulumi.Input<string>;

	/** Secret access key, 64 hex characters. */
	secretAccessKey: pulumi.Input<string>;

	/** Human-readable name for the key in `garage key list`. */
	keyName: pulumi.Input<string>;

	lifecycleRules: LifecycleRule[];
};

const bootstrapScript = `set -eu

ADMIN="http://\${GARAGE_HOST}:3903"
AUTH="Authorization: Bearer \${GARAGE_ADMIN_TOKEN}"
JSON="Content-Type: application/json"

# CreateBucket answers 409 when the bucket is already there, which is the
# normal case on every run after the first. GetBucketInfo below is what
# actually decides whether we have a bucket.
curl -s -o /dev/null -X POST -H "$AUTH" -H "$JSON" \\
	-d "{\\"globalAlias\\":\\"\${BUCKET}\\"}" "$ADMIN/v2/CreateBucket" || true

BUCKET_ID=$(curl -sf -H "$AUTH" "$ADMIN/v2/GetBucketInfo?globalAlias=\${BUCKET}" |
	sed -n 's/.*"id": *"\\([a-f0-9]*\\)".*/\\1/p' | head -1)
test -n "$BUCKET_ID"
echo "bucket \${BUCKET} -> \${BUCKET_ID}"

# ImportKey converges Garage onto the credentials Pulumi already holds, rather
# than Garage minting one that then has to be copied back into config.
curl -s -o /dev/null -X POST -H "$AUTH" -H "$JSON" \\
	-d "{\\"accessKeyId\\":\\"\${ACCESS_KEY_ID}\\",\\"secretAccessKey\\":\\"\${SECRET_ACCESS_KEY}\\",\\"name\\":\\"\${KEY_NAME}\\"}" \\
	"$ADMIN/v2/ImportKey" || true

# Not tolerant: this fails if the key never got imported, so it doubles as the
# check that the step above worked.
curl -sf -o /dev/null -X POST -H "$AUTH" -H "$JSON" \\
	-d "{\\"bucketId\\":\\"\${BUCKET_ID}\\",\\"accessKeyId\\":\\"\${ACCESS_KEY_ID}\\",\\"permissions\\":{\\"read\\":true,\\"write\\":true,\\"owner\\":false}}" \\
	"$ADMIN/v2/AllowBucketKey"
echo "granted read+write to \${ACCESS_KEY_ID}"

curl -sf -o /dev/null -X POST -H "$AUTH" -H "$JSON" \\
	-d "{\\"lifecycleRules\\":\${LIFECYCLE_RULES}}" "$ADMIN/v2/UpdateBucket?id=\${BUCKET_ID}"
echo "lifecycle rules applied"
`;

export class GarageBucket extends pulumi.ComponentResource {
	public readonly job: k8s.batch.v1.Job;

	constructor(
		name: string,
		args: GarageBucketArgs,
		options?: pulumi.ComponentResourceOptions,
	) {
		super("flexisoft:garage:bucket", name, {}, options);

		const { bucket, accessKeyId, secretAccessKey, keyName, lifecycleRules } =
			args;

		// The key would otherwise sit in the Job's pod template in plain text,
		// where anyone who can read a Job can read it.
		const credentials = new k8s.core.v1.Secret(
			`${name}-bucket-credentials`,
			{
				metadata: {
					name: `${name}-bucket-credentials`,
					namespace: namespace.metadata.name,
				},
				stringData: {
					ACCESS_KEY_ID: accessKeyId,
					SECRET_ACCESS_KEY: secretAccessKey,
				},
			},
			{ parent: this, provider },
		);

		this.job = new k8s.batch.v1.Job(
			`${name}-bucket`,
			{
				metadata: {
					name: `${name}-bucket`,
					namespace: namespace.metadata.name,
				},
				spec: {
					backoffLimit: 4,
					template: {
						spec: {
							restartPolicy: "OnFailure",
							securityContext: {
								seccompProfile: { type: "RuntimeDefault" },
							},
							containers: [
								{
									name: "bootstrap",
									image: "curlimages/curl:8.19.0",
									command: ["/bin/sh", "-c", bootstrapScript],
									env: [
										{
											name: "GARAGE_HOST",
											// Garage's admin API is only reachable in-cluster,
											// which is the whole reason this runs as a Job.
											value: interpolate`${service.metadata.name}.${namespace.metadata.name}.svc.cluster.local`,
										},
										{ name: "BUCKET", value: bucket },
										{ name: "KEY_NAME", value: keyName },
										{
											name: "LIFECYCLE_RULES",
											value: JSON.stringify(lifecycleRules),
										},
									],
									envFrom: [
										// GARAGE_ADMIN_TOKEN
										{ secretRef: { name: secrets.metadata.name } },
										{ secretRef: { name: credentials.metadata.name } },
									],
									securityContext: {
										allowPrivilegeEscalation: false,
										readOnlyRootFilesystem: true,
										runAsNonRoot: true,
										// The image declares `USER curl_user`, and kubelet
										// cannot check a name against runAsNonRoot — only a
										// number. 100 is that user.
										runAsUser: 100,
										capabilities: { drop: ["ALL"] },
									},
									resources: {
										requests: { cpu: "10m", memory: "32Mi" },
										limits: { cpu: "200m", memory: "128Mi" },
									},
								},
							],
						},
					},
				},
			},
			{
				parent: this,
				provider,
				dependsOn: [statefulSet],
				deleteBeforeReplace: true,
			},
		);
	}
}
