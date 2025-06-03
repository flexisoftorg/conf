import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("google");

export const project = config.require("project");
export const region = config.get("region") ?? "europe-north1";
export const zone = config.get("region") ?? "europe-north1-a";
