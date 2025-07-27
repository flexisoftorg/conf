import * as gcp from '@pulumi/gcp';
import { provider } from "./provider.js";

export const debugBucket = new gcp.storage.Bucket('debug-bucket', {
  name: 'flexisoft-debug-bucket',
  location: 'eu',
  uniformBucketLevelAccess: true,
  versioning: {
    enabled: true,
  },
  lifecycleRules: [{
    action: { type: 'Delete' },
    condition: {
      age: 30, // Delete objects older than 30 days
    },
  }],
}, { provider });

// Give access to the default service account
// export const debugBucketIAM = new gcp.storage.BucketIAMMember('debug-bucket-iam', {
//   bucket: debugBucket.name,
//   role: 'roles/storage.objectAdmin',
//   // TODO: Figure out how to get the default service account dynamically
//   // member: `serviceAccount:${gcp.config.defaultdefaultServiceAccount}`,
// }, { provider, dependsOn: [debugBucket] });
