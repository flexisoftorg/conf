# Shared resources

These resources should be considered moved into a separate Pulumi program and
consumed by this Pulumi program. Shared resources are things that we should only
control by Pulumi once, such as domains and container registries.

They're not added as a separate program now in the interest of time.
