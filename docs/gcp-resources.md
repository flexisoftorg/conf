# GCP resources — `flexisoft-app`

An overview of what exists in the Google Cloud project, and which parts this
repo actually manages.

Taken 2026-08-09 by enumerating each service with `gcloud`. Cloud Asset
Inventory would give an authoritative list in one call, but
`cloudasset.googleapis.com` is not enabled on the project — so **this list is
curated, not guaranteed exhaustive**. Anything in a service not queried below
will not appear.

Pulumi manages **162** GCP resources. Several things below it does not.

## Not managed by Pulumi

These exist in the project but are absent from the stack. Nothing in this repo
will create, change or protect them.

### A site-to-site VPN

| Resource                        | Detail                                         |
| ------------------------------- | ---------------------------------------------- |
| `nat-gateway-6aab13f`           | e2-micro, `europe-west1-b`, running            |
| `routing-ip-ef5a2cc`            | `34.76.81.192`, attached to the NAT gateway    |
| `vpn-ip-86aeb12`                | `34.22.213.109`, fronting the forwarding rules |
| `vpn-routing-ip`                | `213.179.32.55`, attached to the NAT gateway   |
| `esp-forwarding-rule-b9a67da`   | ESP → `34.22.213.109`                          |
| `ike-forwarding-rule-3756c4a`   | UDP (IKE) → `34.22.213.109`                    |
| `nat-t-forwarding-rule-9e43a58` | UDP (NAT-T) → `34.22.213.109`                  |

ESP plus IKE plus NAT-T is an IPsec tunnel. Given the platform reaches per-tenant
Firebird databases, this is very likely how it gets to them — which would make
this VM a hard dependency for the applications, despite being invisible to the
IaC. **Worth confirming before anyone tidies it away.**

### An application VM

| Resource         | Detail                                           |
| ---------------- | ------------------------------------------------ |
| `elsa-gw-server` | e2-small, `europe-north1-a`, running, 50 GB disk |

Named for the `elsa-gateway` workload currently being added to the cluster.

### Other

| Resource                           | Note                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `flexisoft-temp-debug-storage`     | GCS bucket, EU. `resources/google/debug-bucket.ts` exists but is not imported by `index.ts`, so the bucket is unmanaged. |
| `flexisoft-app.svc.id.goog`        | Workload identity pool created by GKE. The cluster is gone; this is a leftover.                                          |
| `_Required` / `_Default` log sinks | Created by Google, not removable.                                                                                        |
| 7 firewall rules, 2 networks       | Default VPC plus VPN-related rules.                                                                                      |

## Managed by Pulumi

### DNS — 2 zones, 78 record sets

| Zone        | Domain                 | Records                            |
| ----------- | ---------------------- | ---------------------------------- |
| `root-zone` | `fpx.no.`              | 75                                 |
| `main-zone` | `flexisoft.bjerk.dev.` | 3 (legacy; one GitHub Pages CNAME) |

Every A record derives from `cluster:ingress-ip`, so that single config value is
the cutover switch in both directions.

### Artifact Registry

`flexisoft-app` (Docker, `europe-north1`), ~31 GB. The cluster pulls from here
using the `artifact-puller` key. Images are now also pushed to GHCR in parallel,
ahead of an eventual migration.

### Identity — 15 service accounts

Thirteen are Pulumi-managed. One per app repository
(`prod-<app>-github@…`) for GitHub Actions via workload identity federation,
plus two for the cluster:

- `artifact-puller` — pulls images; the key is the `artifact-registry` pull
  secret in `portal-prod`.
- `cert-manager-dns` — solves ACME DNS-01 challenges, which is what makes
  wildcard certificates possible.

The remaining two are Google defaults (`…-compute@`, `…@appspot`).

Also managed: `prod-github-workload-identity` pool and provider, 22 service
account IAM members, 14 Artifact Registry IAM members, 5 project IAM members.

### Reserved address

`flexisoft-core-address` — `35.228.111.75`, `europe-north1`, **RESERVED and
unused**. This fronted the GKE cluster. It is kept because a released Google IP
cannot be reclaimed and it may still sit in customer firewall allowlists.

### Enabled APIs

26 of the 52 enabled services are declared in `resources/google/api-services.ts`.
Some are now unnecessary — `container.googleapis.com` in particular, since the
GKE cluster is deleted.

## Confirmed gone

The migration and cleanup removed these, verified absent:

- **GKE clusters** — 0
- **Cloud Run services** — 0 (the Slack logger)
- **Pub/Sub topics and subscriptions** — 0
- **Eventarc triggers** — 0
- **Custom logging sinks** — 0 beyond Google's two defaults

Also empty: Secret Manager, Cloud SQL.
