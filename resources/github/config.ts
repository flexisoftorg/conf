import * as pulumi from "@pulumi/pulumi";
import { getToken } from "../shared/op-secret.js";

const config = new pulumi.Config("github");
const opConfig = new pulumi.Config("op");

export const token = getToken(
	opConfig.require("flexisoftorg-github-token-path"),
);
export const owner = config.require("owner");
