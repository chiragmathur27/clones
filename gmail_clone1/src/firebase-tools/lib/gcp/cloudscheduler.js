"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrReplaceJob = exports.updateJob = exports.getJob = exports.deleteJob = exports.createJob = void 0;
const _ = require("lodash");
const api = require("../api");
const error_1 = require("../error");
const utils_1 = require("../utils");
const VERSION = "v1beta1";
const DEFAULT_TIME_ZONE = "America/Los_Angeles";
function createJob(job) {
    const strippedName = job.name.substring(0, job.name.lastIndexOf("/"));
    return api.request("POST", `/${VERSION}/${strippedName}`, {
        auth: true,
        origin: api.cloudschedulerOrigin,
        data: Object.assign({ timeZone: DEFAULT_TIME_ZONE }, job),
    });
}
exports.createJob = createJob;
function deleteJob(name) {
    return api.request("DELETE", `/${VERSION}/${name}`, {
        auth: true,
        origin: api.cloudschedulerOrigin,
    });
}
exports.deleteJob = deleteJob;
function getJob(name) {
    return api.request("GET", `/${VERSION}/${name}`, {
        auth: true,
        origin: api.cloudschedulerOrigin,
        resolveOnHTTPError: true,
    });
}
exports.getJob = getJob;
function updateJob(job) {
    return api.request("PATCH", `/${VERSION}/${job.name}`, {
        auth: true,
        origin: api.cloudschedulerOrigin,
        data: Object.assign({ timeZone: DEFAULT_TIME_ZONE }, job),
    });
}
exports.updateJob = updateJob;
async function createOrReplaceJob(job) {
    const jobName = job.name.split("/").pop();
    const existingJob = await getJob(job.name);
    if (existingJob.status === 404) {
        let newJob;
        try {
            newJob = await createJob(job);
        }
        catch (err) {
            if (_.get(err, "context.response.statusCode") === 404) {
                throw new error_1.FirebaseError(`Cloud resource location is not set for this project but scheduled functions requires it. ` +
                    `Please see this documentation for more details: https://firebase.google.com/docs/projects/locations.`);
            }
            throw new error_1.FirebaseError(`Failed to create scheduler job ${job.name}: ${err.message}`);
        }
        utils_1.logLabeledSuccess("functions", `created scheduler job ${jobName}`);
        return newJob;
    }
    if (!job.timeZone) {
        job.timeZone = DEFAULT_TIME_ZONE;
    }
    if (isIdentical(existingJob.body, job)) {
        utils_1.logLabeledBullet("functions", `scheduler job ${jobName} is up to date, no changes required`);
        return;
    }
    const updatedJob = await updateJob(job);
    utils_1.logLabeledBullet("functions", `updated scheduler job ${jobName}`);
    return updatedJob;
}
exports.createOrReplaceJob = createOrReplaceJob;
function isIdentical(job, otherJob) {
    return (job &&
        otherJob &&
        job.schedule === otherJob.schedule &&
        job.timeZone === otherJob.timeZone &&
        _.isEqual(job.retryConfig, otherJob.retryConfig));
}
