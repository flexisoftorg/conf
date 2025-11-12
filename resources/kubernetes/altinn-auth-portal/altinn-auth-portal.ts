import * as pulumi from "@pulumi/pulumi";
import { interpolate } from "@pulumi/pulumi";
import { DeploymentComponent } from "../../components/deployment.js";
import { artifactRepoUrl } from "../../shared/google/artifact-registry.js";
import { provider as kubernetesProvider } from "../../shared/kubernetes/provider.js";
import { customerConfigMap } from "../customer-config.js";
import { namespace } from "../namespace.js";
import { rootDomain } from "../../shared/config.js";

const config = new pulumi.Config("altinn-auth-portal");

const cleanRootDomain = rootDomain.slice(0, -1);
const cleanAltinnDomain = `altinn.${cleanRootDomain}`;

export const altinnAuthPortal = new DeploymentComponent(
  "altinn-auth-portal",
  {
    image: interpolate`${artifactRepoUrl}/altinn-auth-portal`,
    tag: config.require("tag"),
    host: cleanAltinnDomain,
    namespace: namespace.metadata.name,
    port: 8000,
    envFrom: [{ configMapRef: { name: customerConfigMap.metadata.name } }],
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
