import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { interpolate } from '@pulumi/pulumi';

export interface AppComponentArgs {
  image: pulumi.Input<string>;

  /**
   * @default 8000
   */
  port?: pulumi.Input<number>;

  /**
   * List of environment variables to set in the container. Cannot be updated.
   */
  env?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.EnvVar>[]>;

  /**
   * List of sources to populate environment variables in the container. The keys defined within a source must be a C_IDENTIFIER. All invalid keys will be reported as an event when the container is starting. When a key exists in multiple sources, the value associated with the last source will take precedence. Values defined by an Env with a duplicate key will take precedence. Cannot be updated.
   */
  envFrom?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.EnvFromSource>[]>;

  /**
   * If applied, an ingress will be setup
   */
  host?: pulumi.Input<string>;

  /**
   * @default latest
   */
  tag?: pulumi.Input<string>;

  /**
   * @default info
   */
  logLevel?: pulumi.Input<string>;

  /**
   * @default pulumi.getStack()
   */
  environment?: pulumi.Input<string>;

  /**
   * Resources
   */
  resources: pulumi.Input<k8s.types.input.core.v1.ResourceRequirements>;

  namespace?: pulumi.Input<string>;
}

export class DeploymentComponent extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service: k8s.core.v1.Service;

  public readonly ingress?: k8s.networking.v1.Ingress;
  public readonly port: pulumi.Output<number>;

  constructor(
    name: string,
    args: AppComponentArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super('flexisoft:deployment', name, {}, opts);

    const {
      image,
      env = [],
      envFrom = [],
      host,
      tag = 'latest',
      logLevel = 'info',
      port = 8000,
      environment = pulumi.getStack(),
      namespace,
      resources,
    } = args;

    this.port = pulumi.output(port);

    const matchLabels = { app: name, environment };

    this.deployment = new k8s.apps.v1.Deployment(
      name,
      {
        metadata: {
          name,
          namespace,
          labels: { environment },
          annotations: {
            'pulumi.com/skipAwait': 'true',
          },
        },
        spec: {
          replicas: 1,
          selector: { matchLabels },
          template: {
            metadata: { labels: matchLabels },
            spec: {
              containers: [
                {
                  name: 'api',
                  image: interpolate`${image}:${tag}`,
                  imagePullPolicy: 'IfNotPresent',
                  ports: [{ containerPort: port }],
                  envFrom,
                  env: pulumi.output(env).apply(_env => [
                    {
                      name: 'PORT',
                      value: String(port),
                    },
                    // {
                    //   name: 'LOG_LEVEL',
                    //   value: logLevel,
                    // },
                    ..._env,
                  ]),
                  resources,
                },
              ],
            },
          },
        },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    this.service = new k8s.core.v1.Service(
      name,
      {
        metadata: { name, namespace, labels: { environment } },
        spec: {
          ports: [{ port }],
          selector: this.deployment.spec.selector.matchLabels,
        },
      },
      {
        parent: this,
        deleteBeforeReplace: true,
      },
    );

    if (host) {
      this.ingress = new k8s.networking.v1.Ingress(
        `${name}-ingress`,
        {
          metadata: {
            name,
            namespace,
            labels: { environment },
            annotations: {
              'kubernetes.io/ingress.class': 'caddy',
            },
          },
          spec: {
            rules: [
              {
                host,
                http: {
                  paths: [
                    {
                      path: '/',
                      pathType: 'Prefix',
                      backend: {
                        service: {
                          name: this.service.metadata.name,
                          port: { number: port },
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          parent: this,
          deleteBeforeReplace: true,
        },
      );
    }
  }
}
