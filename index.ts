// The static IP outlived the GKE cluster it fronted; it is kept reserved so the
// address itself isn't lost, since a released one can't be reclaimed.
import "./resources/shared/google/ip-address.js";
import "./resources/kubernetes/image-pull-secret.js";
import "./resources/kubernetes/cert-manager.js";
import "./resources/kubernetes/certificates.js";
import "./resources/kubernetes/signoz/signoz.js";
import "./resources/kubernetes/garage/garage.js";
import "./resources/kubernetes/debitor-portal-app/debitor-portal-app.js";
import "./resources/kubernetes/debitor-portal-app/debitor-portal-credentials.js";
import "./resources/kubernetes/api/api.js";
import "./resources/kubernetes/portal-api/redis.js";
import "./resources/kubernetes/portal-api/portal-api.js";
import "./resources/kubernetes/portal-app/portal-app.js";
import "./resources/kubernetes/portal-app/github-actions-secrets.js";
import "./resources/kubernetes/tenants-config-map.js";
import "./resources/kubernetes/portal-app-svelte/portal-app-svelte.js";
import "./resources/kubernetes/altinn-auth-app/altinn-auth-app.js";
import "./resources/kubernetes/auth-app/auth-app.js";
import "./resources/google/customer-dns.js";
import "./resources/kubernetes/ingress.js";
import "./resources/kubernetes/registration-app/registration-app.js";
import "./resources/kubernetes/registration-app/sanity-credentials.js";
import "./resources/shared/shared-resources.js";
import "./resources/repository-access.js";
import "./resources/developer-access.js";
