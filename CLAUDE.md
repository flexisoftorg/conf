# conf

Pulumi infrastructure-as-code for the Flexisoft platform. Manages Kubernetes resources on the `dina-flexisoft` Talos cluster, GitHub configuration, and DNS/ingress on Google Cloud.

## What it manages

- Kubernetes namespaces (one per environment), deployments, ingresses, ConfigMaps
- ingress-nginx as reverse proxy, with cert-manager issuing SSL (ingress hostname: `ingress.fpx.no`)
- GitHub repository secrets (NPM bot tokens)
- Redis deployment for portal session storage
- Customer domain DNS config (CNAME to `ingress.fpx.no` or A records)
- Artifact Registry pull secret for the cluster

The cluster API server is reached **through Dina's cluster proxy**: Pulumi uses the `dina-flexisoft` kubectl context, which `dina clusters connect flexisoft` writes. CI signs in keylessly with the `dinacomputer/setup-dina` action (GitHub OIDC); only `main` of this repo is trusted, so PR previews run without cluster access. The GKE cluster and its static IP are still in state as a rollback path for the migration — they serve no live traffic.

## Stack

- Pulumi with TypeScript (`ts-node/esm`)
- `@pulumi/gcp`, `@pulumi/kubernetes`, `@pulumi/github`
- `@1password/sdk` for secrets
- `@sanity/client` to pull customer config from Sanity

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- Google Cloud SDK (`gcloud auth login`)
- `kubectl`
- Dina CLI, signed in (`dina auth login`) with access to the `flexisoft` cluster
- Node.js + pnpm

## Commands

```sh
pnpm install          # install dependencies
pulumi preview        # preview infrastructure changes
pulumi up             # apply infrastructure changes
pnpm run lint:check   # run xo linter
pnpm run format       # format with prettier
```

## Project structure

```
index.ts             # Pulumi entrypoint
resources/
  kubernetes/        # Kubernetes resources (deployments, ingresses, etc.)
  google/            # GCP-specific resources
  github/            # GitHub secret management
  shared/            # Shared utilities
  config.ts          # Pulumi stack config helpers
Pulumi.prod.yaml     # Production stack config
```

## Custom domain setup

Customers should add a CNAME pointing their subdomains to `ingress.fpx.no`. Root domains must use A records (CNAME on root is not allowed by DNS spec).
