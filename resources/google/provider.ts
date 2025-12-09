import * as gcp from '@pulumi/gcp';
import * as config from './config.js';

export const provider = new gcp.Provider('provider', {
	project: config.project,
	region: config.region,
});
