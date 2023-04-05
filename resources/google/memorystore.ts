import * as gcp from '@pulumi/gcp';

export const redisInstance = new gcp.redis.Instance('redis', {
  tier: 'BASIC',
  memorySizeGb: 1,
  authEnabled: true,
});
