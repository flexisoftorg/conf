import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

export const developers = config.requireObject<string[]>("developers");

export const environment = pulumi.getStack();

const registrationAppConfig = new pulumi.Config("registration-app");

export const registrationAppDomain = registrationAppConfig.require("domain");

const apiConfig = new pulumi.Config("api");

/**
 * Not a routable host: go-api is reached per tenant at `rest.<ident>.fpx.no`,
 * so there is no `rest.fpx.no` record or ingress. This survives only as the
 * `SELF_URL` go-api advertises as its OpenAPI server URL.
 */
export const restApiDomain = apiConfig.require("domain");

const altinnAuthAppConfig = new pulumi.Config("altinn-auth-app");

export const altinnAuthAppDomain = altinnAuthAppConfig.require("domain");

const signozConfig = new pulumi.Config("signoz");

export const signozDomain = signozConfig.require("domain");
