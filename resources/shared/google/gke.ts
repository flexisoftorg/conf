import * as google from "@pulumi/google-native";
import { apiServices } from "../../google/api-services.js";
import { region } from "../../google/config.js";
import { provider } from "./native-provider.js";

export const cluster = new google.container.v1.Cluster(
	"core-cluster",
	{
		name: "flexisoft-main",
		releaseChannel: { channel: "REGULAR" },
		location: region,
		autopilot: { enabled: true },
	},
	{ provider, protect: true, dependsOn: apiServices },
);
