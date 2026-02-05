import * as pulumi from "@pulumi/pulumi";
import { getToken } from "../shared/op-secret.js";

const config = new pulumi.Config("github");
const opConfig = new pulumi.Config("op");
const githubTokenPath = opConfig.require("flexisoftorg-github-token-path");
export const token = getToken(String(githubTokenPath));
export const owner = config.require("owner");
