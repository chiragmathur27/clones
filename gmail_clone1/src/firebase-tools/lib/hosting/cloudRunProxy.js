"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const proxy_1 = require("./proxy");
const getProjectId = require("../getProjectId");
const logger = require("../logger");
const api_1 = require("../api");
const cloudRunCache = {};
function getCloudRunUrl(rewrite, projectId) {
    const alreadyFetched = cloudRunCache[`${rewrite.run.region}/${rewrite.run.serviceId}`];
    if (alreadyFetched) {
        return Promise.resolve(alreadyFetched);
    }
    const path = `/v1/projects/${projectId}/locations/${rewrite.run.region ||
        "us-central1"}/services/${rewrite.run.serviceId}`;
    logger.info(`[hosting] Looking up Cloud Run service "${path}" for its URL`);
    return api_1.request("GET", path, { origin: api_1.cloudRunApiOrigin, auth: true })
        .then((res) => {
        const url = lodash_1.get(res, "body.status.url");
        if (!url) {
            return Promise.reject("Cloud Run URL doesn't exist in response.");
        }
        cloudRunCache[`${rewrite.run.region}/${rewrite.run.serviceId}`] = url;
        return url;
    })
        .catch((err) => {
        const errInfo = `error looking up URL for Cloud Run service: ${err}`;
        return Promise.reject(errInfo);
    });
}
function default_1(options) {
    return async (rewrite) => {
        if (!rewrite.run) {
            return proxy_1.errorRequestHandler('Cloud Run rewrites must have a valid "run" field.');
        }
        if (!rewrite.run.serviceId) {
            return proxy_1.errorRequestHandler("Cloud Run rewrites must supply a service ID.");
        }
        if (!rewrite.run.region) {
            rewrite.run.region = "us-central1";
        }
        logger.info(`[hosting] Cloud Run rewrite ${JSON.stringify(rewrite)} triggered`);
        const textIdentifier = `Cloud Run service "${rewrite.run.serviceId}" for region "${rewrite.run.region}"`;
        return getCloudRunUrl(rewrite, getProjectId(options, false))
            .then((url) => proxy_1.proxyRequestHandler(url, textIdentifier))
            .catch(proxy_1.errorRequestHandler);
    };
}
exports.default = default_1;
