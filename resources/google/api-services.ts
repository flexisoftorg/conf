import * as gcp from '@pulumi/gcp';
import { provider } from './provider';

const apis = [
  'servicemanagement.googleapis.com',
  'servicecontrol.googleapis.com',
  'container.googleapis.com',
  'compute.googleapis.com',
  'dns.googleapis.com',
  'cloudresourcemanager.googleapis.com',
  'logging.googleapis.com',
  'stackdriver.googleapis.com',
  'monitoring.googleapis.com',
  'cloudtrace.googleapis.com',
  'clouderrorreporting.googleapis.com',
  'clouddebugger.googleapis.com',
  'cloudprofiler.googleapis.com',
  'sqladmin.googleapis.com',
  'cloudkms.googleapis.com',
  'cloudfunctions.googleapis.com',
  'cloudbuild.googleapis.com',
  'iam.googleapis.com',
  'iap.googleapis.com',
  'run.googleapis.com',
  'firebase.googleapis.com',
  'firebasehosting.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firestore.googleapis.com',
  'artifactregistry.googleapis.com',
  'redis.googleapis.com',
];

export const apiServices = apis.map(
  service =>
    new gcp.projects.Service(
      service,
      {
        service,
        disableOnDestroy: false,
      },
      { provider },
    ),
);
