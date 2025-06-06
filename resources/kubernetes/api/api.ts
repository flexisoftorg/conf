import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";
import { interpolate } from "@pulumi/pulumi";
import { DeploymentComponent } from "../../components/deployment.js";
import { apiDomain } from "../../config.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { registrationAppSanityCredentials } from "../registration-app/sanity-credentials.js";
import { redis } from "../portal-api/redis.js";

const config = new pulumi.Config("api");
const portalApiConfig = new pulumi.Config("portal-api");

const cleanApiDomain = apiDomain.slice(0, -1);

export const fullApiDomain = interpolate`https://${cleanApiDomain}`;

const cookieSecret = portalApiConfig.requireSecret("cookie-secret");

export const apiEnvSecrets = new kubernetes.core.v1.Secret(
  "api-env-secrets",
  {
    metadata: {
      name: "api-env-secrets",
      namespace: namespace.metadata.name,
    },
    data: {
      COOKIE_SECRET: cookieSecret,
    },
  },
  { provider: kubernetesProvider },
);

export const Api = new DeploymentComponent(
  "api",
  {
    image: interpolate`${artifactRepoUrl}/api`,
    tag: config.require("tag"),
    host: cleanApiDomain,
    namespace: namespace.metadata.name,
    envFrom: [
      { secretRef: { name: registrationAppSanityCredentials.metadata.name } },
    ],
    env: [
      {
        name: "REDIS_URL",
        value: interpolate`${redis.service.metadata.name}.${redis.service.metadata.namespace}.svc.cluster.local:6379`,
      },
      {
        name: "SELF_URL",
        value: fullApiDomain,
      },
    ],
    port: 8000,
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
