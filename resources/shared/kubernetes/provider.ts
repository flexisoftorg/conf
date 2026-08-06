import * as k8s from "@pulumi/kubernetes";
import { kubeconfig } from "./config.js";

export const provider = new k8s.Provider("k8s-provider", {
	kubeconfig,
});
