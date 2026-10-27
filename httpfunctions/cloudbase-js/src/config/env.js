"use strict";
function getCloudbaseEnvId() {
  if (process.env.CBR_ENV_ID) {
    return process.env.CBR_ENV_ID;
  } else if (process.env.SCF_NAMESPACE) {
    return process.env.SCF_NAMESPACE;
  } else {
    return process.env.CLOUDBASE_ENV_ID || "";
  }
}
export function getEnvId() {
  return getCloudbaseEnvId();
}
export function getEnvConfig() {
  return {
    envId: getCloudbaseEnvId(),
    apiKey: process.env.CLOUDBASE_APIKEY || ""
  };
}
export function getApiKey() {
  const apiKey = process.env.CLOUDBASE_APIKEY || "";
  return apiKey.replace("Bearer", "").trim();
}
export function getOpenAPIBaseURL() {
  const envId = getCloudbaseEnvId();
  return `https://${envId}.api.tcloudbasegateway.com`;
}
