import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { environment } from "../config.js";
import { region } from "../google/config.js";

export type CloudRunServiceProps = {
	imageName: pulumi.Input<string>;

	tag?: pulumi.Input<string>;
	location?: pulumi.Input<string>;
	serviceAccount?: gcp.serviceaccount.Account;
	invokers?: Array<pulumi.Input<string>>;
	secrets?: gcp.types.input.cloudrun.ServiceTemplateSpecContainerEnv[];
	envs?: gcp.types.input.cloudrun.ServiceTemplateSpecContainerEnv[];
	isPublic?: boolean;
};

export class CloudRunService extends pulumi.ComponentResource {
	readonly serviceAccount: gcp.serviceaccount.Account;
	readonly service: gcp.cloudrun.Service;
	readonly url: pulumi.Output<string>;

	constructor(
		name: string,
		args: CloudRunServiceProps,
		options?: pulumi.ComponentResourceOptions,
	) {
		super("cloudrun-service", name, args, options);
		const {
			location = region,
			imageName,
			tag,
			envs = [],
			// ServiceAccount,
			isPublic = true,
			invokers = [],
		} = args;

		const image = tag
			? pulumi.interpolate`${imageName}:${tag}`
			: imageName;

		this.serviceAccount = new gcp.serviceaccount.Account(
			name,
			{
				accountId: name,
			},
			{
				parent: this,
				deleteBeforeReplace: true,
			},
		);

		this.service = new gcp.cloudrun.Service(
			name,
			{
				location,
				name: pulumi.interpolate`${name}-${environment}`,
				template: {
					spec: {
						containerConcurrency: 80,
						serviceAccountName:
							this.serviceAccount
								.email,
						containers: [
							{
								image,
								envs,
							},
						],
					},
				},
			},
			{ parent: this },
		);

		if (isPublic) {
			new gcp.cloudrun.IamMember(
				name,
				{
					location,
					service: this.service.name,
					member: "allUsers",
					role: "roles/run.invoker",
				},
				{ parent: this },
			);
		}

		invokers.map((wrappedInvoker) =>
			pulumi.output(wrappedInvoker).apply(
				(invoker) =>
					new gcp.cloudrun.IamMember(
						`${name}-${invoker}`,
						{
							location,
							service: this.service
								.name,
							member: invoker,
							role: "roles/run.invoker",
						},
						{ parent: this },
					),
			),
		);

		this.url = this.service.statuses[0].apply((s) => s?.url);
	}
}
