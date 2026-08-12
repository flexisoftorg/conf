import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

export const developers = config.requireObject<string[]>("developers");

export const environment = pulumi.getStack();

const registrationAppConfig = new pulumi.Config("registration-app");

export const registrationAppDomain = registrationAppConfig.require("domain");

const altinnAuthAppConfig = new pulumi.Config("altinn-auth-app");

export const altinnAuthAppDomain = altinnAuthAppConfig.require("domain");

const signozConfig = new pulumi.Config("signoz");

export const signozDomain = signozConfig.require("domain");
