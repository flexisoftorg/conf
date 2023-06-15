# Customer Portal

We utilize Sanity to configure the customer portal. This allows us to easily add
and remove customers, and update their information.

See the [Studio Repository][studio-repo] for more
information. Access [the studio website to manage customers][studio].

[studio-repo]: https://github.com/flexisoftorg/studio
[studio]: https://studio.flexisoft.bjerk.dev

## How this is wired

Data from Sanity is parsed and used to generate infrastructure resources. These
are mainly a ingress resource. The ingress resource is used to route traffic to
our API and frontend application on customers custom domain.

**Note**: This means that every time data from Sanity is changed, we'll need to
deploy the infrastructure to update the ingress resources.

The ingress configures both API address (`api.<custom domain>`) and frontend on
the custom domain.

## The schema

The schema is defined in the [studio repository][schema].

[schema]: https://github.com/flexisoftorg/studio/blob/main/schemas/customer.ts