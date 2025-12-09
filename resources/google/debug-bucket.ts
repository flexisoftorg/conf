import * as gcp from '@pulumi/gcp';

export const debugBucket = new gcp.storage.Bucket('debug-bucket', {
	name: 'debug-bucket',
	location: 'eu',
	uniformBucketLevelAccess: true,
	versioning: {
		enabled: true,
	},
	lifecycleRules: [{
		action: {type: 'Delete'},
		condition: {
			age: 30, // Delete objects older than 30 days
		},
	}],
});
