# Observability

[SigNoz](https://signoz.io/) runs in the cluster and is served at
[obs.fpx.no](https://obs.fpx.no). It is declared in
`resources/kubernetes/signoz/signoz.ts` as two Helm releases: the SigNoz stack
itself, and `k8s-infra`, which is what actually produces telemetry.

## What is collected today

| Signal                 | Source                      | Status      |
| ---------------------- | --------------------------- | ----------- |
| Container logs         | `k8s-infra` agent DaemonSet | Working     |
| Host + kubelet metrics | `k8s-infra` agent DaemonSet | Working     |
| Cluster metrics        | `k8s-infra` deployment      | Working     |
| Kubernetes events      | `k8s-infra` deployment      | Working     |
| Traces / APM           | application SDKs            | **Missing** |

## The Services page is empty, and why

SigNoz's **Services** view is built entirely from traces. `k8s-infra` observes
the cluster from the outside and cannot produce them — a trace has to start
inside the process handling the request. Until the applications are
instrumented, Services and Traces stay empty while logs and metrics work.

Getting services requires a change per application, not configuration here:

1. An OpenTelemetry SDK in the image.
2. `OTEL_EXPORTER_OTLP_ENDPOINT` pointing at the collector.
3. `OTEL_SERVICE_NAME` to identify the service.

Setting the environment variables alone does nothing. Without an SDK in the
image, nothing reads them.

**Node/TypeScript apps** (portal-api, auth-app, registration-app, the portal
apps) can be instrumented without touching application code — add
`@opentelemetry/auto-instrumentations-node` as a dependency, then set
`NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register`.
That yields HTTP, database and Redis spans automatically.

**Go services** (`api`, `portal-app-go`) need real code changes. Go has no
runtime injection equivalent.

The collector endpoint, from inside the cluster:

```
http://signoz-otel-collector.signoz.svc.cluster.local:4318
```

Note it is a full URL on the OTLP/HTTP port. The chart's default exporter is
`otlphttp`, not gRPC — a bare `host:port`, or port 4317, fails with
`unsupported protocol scheme`.

## Alerting

Log-based Slack alerting used to run through `resources/google/slack-logger.ts`:
a Cloud Logging sink matching `jsonPayload.slack:*`, feeding Pub/Sub, Eventarc
and a Cloud Run service.

That pipeline was inert from the moment we left GKE — GKE's agent shipped
container stdout into Cloud Logging automatically, and the Talos cluster has no
such agent, so nothing ever reached the sink. It failed silently, which is how a
broken alerting path usually fails. It has since been deleted.

Alerting now runs in SigNoz:

- A **`slack` notification channel** posting to `#flexi-soft-notifications`,
  reusing the same webhook (`slack:webhook-url` in the stack config).
- An **`Application errors`** rule — a logs threshold alert firing when any log
  body contains `"severity":"ERROR"` over a 5 minute window, evaluated every
  minute.

The rule matches the raw log body rather than `severity_text` on purpose. Log
parsing is only partial (see below), so a severity-based rule would quietly
match nothing.

## Dashboards

Four dashboards ship with the instance:

- **Kubernetes — infrastructure**: container CPU, memory and working set,
  restarts, pod network I/O and errors, and utilisation against limits.
- **Applications — logs**: overall and `portal-prod` log volume, error and
  warning rates.
- **Storage**: volume available/capacity and container filesystem usage —
  worth watching, since ClickHouse and Garage share one node's disk.
- **Garage — object storage**: PVC capacity and headroom, node filesystem,
  cluster health, partition status, resync and insert queues, plus Garage's own
  CPU and memory.

Every panel sets `formatting.unit` explicitly so byte counts render as KiB/MiB
rather than raw integers. Unit ids are SigNoz's "universal" ones — `bytes`
(IEC), `By` (decimal), `%`, `percentunit`, `{count}`, `{count}/s`, `s`, `ms`.

Garage's metrics come from its Prometheus endpoint on port 3903, scraped because
the pod carries `signoz.io/scrape: "true"` and the `prometheus` preset is
enabled on `k8s-infra`. Any other pod can be scraped the same way.

One trap: `garage_local_disk_total` reports the **node's filesystem** (~695 GiB),
not the 200 GB layout capacity. To watch the cap being approached, use the
`k8s.volume.*` metrics filtered to the `garage` namespace, which reflect the
actual PVCs.

They use the `v6` (Perses) dashboard schema, which is the only one this build
accepts — the v1 API returns `501 dashboard_deprecated`. The nesting is not
obvious, so for reference:

```jsonc
{
	"schemaVersion": "v6",
	"name": "<slug>", // required, distinct from display name
	"spec": {
		"display": { "name": "Human title" },
		"variables": [],
		"links": [],
		"panels": {
			"cpu": {
				"kind": "Panel",
				"spec": {
					"display": { "name": "Panel title" },
					"plugin": { "kind": "signoz/TimeSeriesPanel", "spec": {} },
					"queries": [
						{
							"kind": "time_series",
							"spec": {
								"plugin": {
									"kind": "signoz/BuilderQuery",
									"spec": {
										"name": "A",
										"signal": "metrics",
										"aggregations": [
											{
												"metricName": "container.cpu.usage",
												"timeAggregation": "avg",
												"spaceAggregation": "sum",
											},
										],
									},
								},
							},
						},
					],
				},
			},
		},
		"layouts": [
			{
				"kind": "Grid",
				"spec": {
					"items": [
						{
							"x": 0,
							"y": 0,
							"width": 6,
							"height": 8,
							"content": { "$ref": "#/spec/panels/cpu" },
						},
					],
				},
			},
		],
	},
}
```

The grid is 12 columns wide in total, so `x + width` must not exceed 12.

**Dashboards, alert rules and channels live in SigNoz, not in Pulumi.** There is
no Pulumi provider for SigNoz, so they were created through its API and are not
captured as code. They will not be recreated if the instance is rebuilt.

**Log parsing is partial.** The `json_parser` operator populates `severity_text`
for most app logs, but entries whose JSON spans multiple lines — large payloads
such as `rawCustomers` — still arrive unparsed, because the container parser
does not join them. Fixing that needs a `recombine` operator before the JSON
parse.

## Gotchas worth knowing

**Pod Security.** Talos enforces the `baseline` policy by default, which forbids
`hostPath` volumes and host ports. Any workload needing host access — log
collectors especially — must live in a namespace labelled
`pod-security.kubernetes.io/enforce: privileged`. That is why `k8s-infra` has
its own namespace instead of sharing SigNoz's: the elevated policy is scoped to
the one component that requires it. The failure mode is a DaemonSet stuck at
`DESIRED 1, CURRENT 0`, with the reason only visible in its events.

**Pods running does not mean telemetry is flowing.** The agent sat `1/1 Running`
while every export failed. Verify against the data, not pod status:

```sh
kubectl -n signoz exec chi-signoz-<suffix>-clickhouse-cluster-0-0-0 -- \
  clickhouse-client --query "SELECT count() FROM signoz_logs.logs_v2"
```

**Storage is node-local and fixed.** ClickHouse uses a 100Gi `local-path`
volume on the single node. It is not replicated, it is lost with the node, and
`local-path` does not support expansion — growing it means recreating the
volume.
