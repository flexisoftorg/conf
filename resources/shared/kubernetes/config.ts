import { Config } from "@pulumi/pulumi";

const config = new Config();

export const systemEmail = config.require("system-email");

const clusterConfig = new Config("cluster");

/**
 * Kubectl context for the target cluster. The API server is reached through
 * Dina's cluster proxy; `dina clusters connect flexisoft` (or the
 * dinacomputer/setup-dina action in CI) writes this context.
 */
export const kubeContext = clusterConfig.get("context") ?? "dina-flexisoft";

/**
 * Public address traffic reaches the cluster on. The node itself only has an
 * internal IP (10.20.1.10) — this is the external address NAT'd to the
 * ingress-nginx NodePorts.
 */
export const ingressIpAddress = clusterConfig.require("ingress-ip");

export const ingressClassName = clusterConfig.get("ingress-class") ?? "nginx";

export const clusterIssuer =
	clusterConfig.get("cluster-issuer") ?? "letsencrypt";
