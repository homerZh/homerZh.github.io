import cloudbase from '@cloudbase/js-sdk';

const { env, region, accessKey } = window.CLOUDBASE_CONFIG;
// Use the gateway that recognizes this environment's authentication users.
// Browser CORS must be configured in CloudBase, not bypassed by switching hosts.
export const app = cloudbase.init({ env, region, accessKey, endPointMode: 'GATEWAY' });
