import * as k8s from "@pulumi/kubernetes";
import { provider } from "../shared/kubernetes/provider.js";

const name = "portal-prod";

export const namespace = new k8s.core.v1.Namespace(
  name,
  {
    metadata: {
      name,
      annotations: {
        "pulumi.com/skipAwait": "true",
      },
    },
  },
  { provider },
);
