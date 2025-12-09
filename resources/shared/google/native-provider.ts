import * as google from "@pulumi/google-native";
import { project, region, zone } from "../../google/config.js";

export const provider = new google.Provider("main-google", {
	project,
	region,
	zone,
});
