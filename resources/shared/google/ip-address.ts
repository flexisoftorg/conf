import * as gcp from "@pulumi/gcp";
import { apiServices } from "../../google/api-services.js";
import { region } from "../../google/config.js";
import { provider } from "../../google/provider.js";

export const ipAddress = new gcp.compute.Address(
	"flexisoft-core-address",
	{
		name: "flexisoft-core-address",
		addressType: "EXTERNAL",
		region,
	},
	{ provider, dependsOn: apiServices, protect: true },
);
