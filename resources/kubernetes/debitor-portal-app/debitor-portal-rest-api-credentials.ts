import * as k8s from "@pulumi/kubernetes";
import { provider } from "../../shared/kubernetes/provider.js";
import { namespace } from "../namespace.js";
import { debitorPortalAppApiKey } from "../api/api.js";

export const debitorPortalRestApiCredentials = new k8s.core.v1.Secret(
  "debitor-portal-rest-api-credentials",
  {
    metadata: {
      name: "debitor-portal-rest-api-credentials",
      namespace: namespace.metadata.name,
    },
    stringData: {
      REST_API_KEY: debitorPortalAppApiKey,
    },
  },
  { provider },
);
