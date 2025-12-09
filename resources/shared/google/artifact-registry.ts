import * as gcp from "@pulumi/gcp";
import { interpolate } from "@pulumi/pulumi";
import { environment } from "../../config.js";
import { apiServices } from "../../google/api-services.js";
import { project, region } from "../../google/config.js";
import { provider } from "../../google/provider.js";

export const repository = new gcp.artifactregistry.Repository(
	"main-artifact-registry",
	{
		repositoryId: project,
		location: region,
		format: "DOCKER",
		description: "Main artifact registry, used for most services.",
		labels: {
			environment,
		},
	},
	{ provider, dependsOn: apiServices },
);

export const artifactRepoUrl = interpolate`${repository.location}-docker.pkg.dev/${project}/${repository.repositoryId}`;
