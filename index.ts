import "./resources/shared/google/gke.js";
import "./resources/shared/google/ip-address.js";
import "./resources/shared/kubernetes/ingress-controller-chart.js";
import "./resources/kubernetes/debitor-portal-app/debitor-portal-app.js";
import "./resources/kubernetes/debitor-portal-app/debitor-portal-credentials.js";
import "./resources/kubernetes/api/api.js";
import "./resources/kubernetes/portal-api/redis.js";
import "./resources/kubernetes/portal-api/portal-api.js";
import "./resources/kubernetes/portal-app/portal-app.js";
import "./resources/google/customer-dns.js";
import "./resources/kubernetes/ingress.js";
import "./resources/kubernetes/registration-app/registration-app.js";
import "./resources/kubernetes/registration-app/sanity-credentials.js";
import "./resources/shared/shared-resources.js";
import "./resources/google/slack-logger.js";
import "./resources/repository-access.js";
import "./resources/developer-access.js";

function myFunction() {
	// This is one indentation deep
	const result = [1, 2, 3].map((number_) => number_ * 2);
	return result;
}
