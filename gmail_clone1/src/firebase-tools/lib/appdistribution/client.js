"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDistributionClient = exports.UploadStatus = void 0;
const _ = require("lodash");
const api = require("../api");
const utils = require("../utils");
const error_1 = require("../error");
const pkg = require("../../package.json");
var UploadStatus;
(function (UploadStatus) {
    UploadStatus["SUCCESS"] = "SUCCESS";
    UploadStatus["IN_PROGRESS"] = "IN_PROGRESS";
    UploadStatus["ERROR"] = "ERROR";
})(UploadStatus = exports.UploadStatus || (exports.UploadStatus = {}));
class AppDistributionClient {
    constructor(appId) {
        this.appId = appId;
    }
    async getApp() {
        utils.logBullet("getting app details...");
        const apiResponse = await api.request("GET", `/v1alpha/apps/${this.appId}`, {
            origin: api.appDistributionOrigin,
            auth: true,
        });
        return _.get(apiResponse, "body");
    }
    async uploadDistribution(distribution) {
        const apiResponse = await api.request("POST", `/app-binary-uploads?app_id=${this.appId}`, {
            auth: true,
            origin: api.appDistributionOrigin,
            headers: {
                "X-APP-DISTRO-API-CLIENT-ID": pkg.name,
                "X-APP-DISTRO-API-CLIENT-TYPE": distribution.platform(),
                "X-APP-DISTRO-API-CLIENT-VERSION": pkg.version,
                "Content-Type": "application/octet-stream",
            },
            data: distribution.readStream(),
            json: false,
        });
        return _.get(JSON.parse(apiResponse.body), "token");
    }
    async pollUploadStatus(binaryName, retryCount = 0) {
        const uploadStatus = await this.getUploadStatus(binaryName);
        if (uploadStatus.status === UploadStatus.IN_PROGRESS) {
            if (retryCount >= AppDistributionClient.MAX_POLLING_RETRIES) {
                throw new error_1.FirebaseError("it took longer than expected to process your binary, please try again", { exit: 1 });
            }
            await new Promise((resolve) => setTimeout(resolve, AppDistributionClient.POLLING_INTERVAL_MS));
            return this.pollUploadStatus(binaryName, retryCount + 1);
        }
        else if (uploadStatus.status === UploadStatus.SUCCESS) {
            return uploadStatus.release.id;
        }
        else {
            throw new error_1.FirebaseError(`error processing your binary: ${uploadStatus.message} (Code: ${uploadStatus.errorCode})`);
        }
    }
    async getUploadStatus(binaryName) {
        const encodedBinaryName = encodeURIComponent(binaryName);
        const apiResponse = await api.request("GET", `/v1alpha/apps/${this.appId}/upload_status/${encodedBinaryName}`, {
            origin: api.appDistributionOrigin,
            auth: true,
        });
        return _.get(apiResponse, "body");
    }
    async addReleaseNotes(releaseId, releaseNotes) {
        if (!releaseNotes) {
            utils.logWarning("no release notes specified, skipping");
            return;
        }
        utils.logBullet("adding release notes...");
        const data = {
            releaseNotes: {
                releaseNotes,
            },
        };
        try {
            await api.request("POST", `/v1alpha/apps/${this.appId}/releases/${releaseId}/notes`, {
                origin: api.appDistributionOrigin,
                auth: true,
                data,
            });
        }
        catch (err) {
            throw new error_1.FirebaseError(`failed to add release notes with ${err.message}`, { exit: 1 });
        }
        utils.logSuccess("added release notes successfully");
    }
    async enableAccess(releaseId, emails = [], groupIds = []) {
        if (emails.length === 0 && groupIds.length === 0) {
            utils.logWarning("no testers or groups specified, skipping");
            return;
        }
        utils.logBullet("adding testers/groups...");
        const data = {
            emails,
            groupIds,
        };
        try {
            await api.request("POST", `/v1alpha/apps/${this.appId}/releases/${releaseId}/enable_access`, {
                origin: api.appDistributionOrigin,
                auth: true,
                data,
            });
        }
        catch (err) {
            let errorMessage = err.message;
            if (_.has(err, "context.body.error")) {
                const errorStatus = _.get(err, "context.body.error.status");
                if (errorStatus === "FAILED_PRECONDITION") {
                    errorMessage = "invalid testers";
                }
                else if (errorStatus === "INVALID_ARGUMENT") {
                    errorMessage = "invalid groups";
                }
            }
            throw new error_1.FirebaseError(`failed to add testers/groups: ${errorMessage}`, { exit: 1 });
        }
        utils.logSuccess("added testers/groups successfully");
    }
}
exports.AppDistributionClient = AppDistributionClient;
AppDistributionClient.MAX_POLLING_RETRIES = 60;
AppDistributionClient.POLLING_INTERVAL_MS = 2000;
