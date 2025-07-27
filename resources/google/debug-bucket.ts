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

