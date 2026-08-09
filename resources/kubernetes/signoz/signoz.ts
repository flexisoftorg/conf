import * as k8s from "@pulumi/kubernetes";
import { interpolate } from "@pulumi/pulumi";
import { signozDomain } from "../../config.js";
import { ingressClassName } from "../../shared/kubernetes/config.js";
import { provider } from "../../shared/kubernetes/provider.js";
import { dnsClusterIssuer, dnsIssuer } from "../cert-manager.js";

const cleanSignozDomain = signozDomain.slice(0, -1);

const name = "signoz";

const namespace = new k8s.core.v1.Namespace(
	name,
	{
		metadata: {
			name,
		},
	},
	{ provider },
);

/**
 * Observability stack: ClickHouse for storage, an OTel collector for ingest,
 * and the SigNoz UI. Installed as a Helm release rather than rendered
 * templates — the chart ships StatefulSets and migration hooks that want a
 * real Helm lifecycle.
 *
 * The `*.fpx.no` wildcard lives in `portal-prod` and TLS secrets don't cross
 * namespaces, so this gets its own certificate. DNS-01 is used rather than
 * HTTP-01 so issuance doesn't race the new DNS record propagating.
 */
export const signoz = new k8s.helm.v3.Release(
	name,
	{
		// Deliberately NOT pinning `name`: changing it replaces the release, which
		// destroys the `signoz-db` volume holding the login, notification channels
		// and alert rules. Anything referencing the generated names derives them
		// from `signoz.name` instead.
		chart: "signoz",
		// Renovate: depName=signoz packageName=signoz registryUrl=https://charts.signoz.io/
		version: "0.136.1",
		repositoryOpts: {
			repo: "https://charts.signoz.io",
		},
		namespace: namespace.metadata.name,
		// ClickHouse and its migrations take well past the default five minutes
		// on a first install.
		timeout: 1200,
		values: {
			clickhouse: {
				persistence: {
					size: "100Gi",
				},
				resources: {
					requests: {
						cpu: "500m",
						memory: "4Gi",
					},
				},
			},
			signoz: {
				ingress: {
					enabled: true,
					className: ingressClassName,
					annotations: {
						"cert-manager.io/cluster-issuer": dnsClusterIssuer,
					},
					hosts: [
						{
							host: cleanSignozDomain,
							paths: [
								{
									path: "/",
									pathType: "Prefix",
									port: 8080,
								},
							],
						},
					],
					tls: [
						{
							secretName: "signoz-tls",
							hosts: [cleanSignozDomain],
						},
					],
				},
			},
		},
	},
	{ provider, dependsOn: [dnsIssuer] },
);

/**
 * The SigNoz chart only stands up the receiving end. This is what actually
 * produces telemetry: a DaemonSet scraping container logs, host and kubelet
 * metrics off the node, plus a deployment collecting cluster-level metrics and
 * Kubernetes events.
 */
const collectorName = "k8s-infra";

/**
 * The agent reads container logs from the host and binds host ports, which
 * Talos's default `baseline` Pod Security level forbids. It gets its own
 * namespace so the elevated policy covers the collector only, leaving SigNoz
 * itself under `baseline`.
 */
const collectorNamespace = new k8s.core.v1.Namespace(
	collectorName,
	{
		metadata: {
			name: collectorName,
			labels: {
				"pod-security.kubernetes.io/enforce": "privileged",
			},
		},
	},
	{ provider },
);

export const k8sInfra = new k8s.helm.v3.Release(
	collectorName,
	{
		name: collectorName,
		chart: "k8s-infra",
		// Renovate: depName=k8s-infra packageName=k8s-infra registryUrl=https://charts.signoz.io/
		version: "0.17.0",
		repositoryOpts: {
			repo: "https://charts.signoz.io",
		},
		namespace: collectorNamespace.metadata.name,
		values: {
			clusterName: "dina-flexisoft",
			// A full URL, not host:port — the chart's default exporter is
			// `otlphttp`, so this is 4318 (OTLP/HTTP) rather than 4317 (gRPC), and
			// it needs the scheme. Derived from the release rather than hardcoded,
			// since Helm generates the name.
			// In-cluster hop, so plaintext is fine.
			otelCollectorEndpoint: interpolate`http://${signoz.name}-otel-collector.${namespace.metadata.name}.svc.cluster.local:4318`,
			otelInsecure: true,
			presets: {
				logsCollection: {
					enabled: true,
					// The apps emit structured JSON. Without a parser the whole object
					// stays an opaque string in `body`, `severity_text` is never
					// populated, and severity-based alerts silently match nothing.
					// `container-parser` has to be repeated — this list replaces the
					// chart's default rather than appending to it.
					operators: [
						{ id: "container-parser", type: "container" },
						{
							id: "json-parser",
							type: "json_parser",
							// Anchored only at the start: container log entries keep a
							// trailing newline, so a closing `}$` anchor never matches.
							if: String.raw`body matches "^\\{"`,
							parse_from: "body",
							parse_to: "attributes",
							severity: { parse_from: "attributes.severity" },
							// Plenty of pods log plain text; a failed parse should pass the
							// entry through rather than error on every line.
							on_error: "send_quiet",
						},
					],
				},
				hostMetrics: { enabled: true },
				kubeletMetrics: { enabled: true },
				clusterMetrics: { enabled: true },
				k8sEvents: { enabled: true },
				// Scrapes any pod annotated `signoz.io/scrape: "true"`, which is how
				// Garage's Prometheus endpoint gets collected.
				prometheus: { enabled: true },
			},
		},
	},
	{ provider, dependsOn: [signoz] },
);
