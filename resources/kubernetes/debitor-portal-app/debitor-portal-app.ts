import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { DeploymentComponent } from "../../components/deployment.js";
import { debitorPortalAppDomain } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { debitorPortalCredentials } from "./debitor-portal-credentials.js";
import { debitorPaymentProvider } from "./debitor-portal-payment-provider.js";
import { debitorPortalRestApiCredentials } from "./debitor-portal-rest-api-credentials.js";
import { customers } from "../../get-customers.js";

const config = new pulumi.Config("debitor-portal-app");

const cleanDebitorPortalAppDomain = debitorPortalAppDomain.slice(0, -1);

export const debitorPortalApp = new DeploymentComponent(
  "debitor-portal-app",
  {
    image: interpolate`${artifactRepoUrl}/debitor-portal-app`,
    tag: config.require("tag"),
    namespace: namespace.metadata.name,
    host: cleanDebitorPortalAppDomain,
    legacyHost: "debitor.flexisoft.bjerk.dev",
    port: 8000,
    envFrom: [
      { secretRef: { name: debitorPortalCredentials.metadata.name } },
      { secretRef: { name: debitorPortalRestApiCredentials.metadata.name } },
      { configMapRef: { name: debitorPaymentProvider.metadata.name } },
    ],
    env: [
      {
        name: "CUSTOMERS",
        value: customers.apply((customers) =>
          JSON.stringify(
            customers.filter((customer) => customer.debitorPortalEnabled),
          ),
        ),
      },
    ],
    resources: {
      requests: {
        cpu: "250m",
        memory: "512Mi",
      },
      limits: {
        cpu: "250m",
        memory: "512Mi",
      },
    },
  },
  { provider: kubernetesProvider },
);
