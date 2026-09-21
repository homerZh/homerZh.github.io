import cloudbase from '@cloudbase/js-sdk';

const { env, region, accessKey } = window.CLOUDBASE_CONFIG;
export const app = cloudbase.init({ env, region, accessKey, endPointMode: 'CLOUD_API' });
// The generic gateway returns 403 without CORS headers for this environment.
// CLOUD_API switches authentication to the official regional endpoint.
// PostgreSQL keeps its SDK-managed gateway route; its regional path differs.
