import * as k8s from "@pulumi/kubernetes";
import { kubeContext } from "./config.js";

export const provider = new k8s.Provider("k8s-provider", {
	// An empty kubeconfig makes the provider load ~/.kube/config. It must stay a
	// string: left undefined, the SDK fills in $KUBECONFIG, and a kubeconfig
	// that names a different server than the one in state plans a replacement
	// of every Kubernetes resource.
	kubeconfig: "",
	context: kubeContext,
});
