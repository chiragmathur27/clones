"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_color_1 = require("cli-color");
const api_1 = require("../hosting/api");
const command_1 = require("../command");
const expireUtils_1 = require("../hosting/expireUtils");
const error_1 = require("../error");
const utils_1 = require("../utils");
const prompt_1 = require("../prompt");
const requirePermissions_1 = require("../requirePermissions");
const getProjectId = require("../getProjectId");
const logger = require("../logger");
const requireConfig = require("../requireConfig");
const marked = require("marked");
const requireHostingSite_1 = require("../requireHostingSite");
const LOG_TAG = "hosting:channel";
exports.default = new command_1.Command("hosting:channel:create [channelId]")
    .description("create a Firebase Hosting channel")
    .option("-e, --expires <duration>", "duration string (e.g. 12h or 30d) for channel expiration, max 30d")
    .option("--site <siteId>", "site for which to create the channel")
    .before(requireConfig)
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.update"])
    .before(requireHostingSite_1.requireHostingSite)
    .action(async (channelId, options) => {
    const projectId = getProjectId(options);
    const site = options.site;
    let expireTTL = expireUtils_1.DEFAULT_DURATION;
    if (options.expires) {
        expireTTL = expireUtils_1.calculateChannelExpireTTL(options.expires);
    }
    if (!channelId) {
        if (options.nonInteractive) {
            throw new error_1.FirebaseError(`"channelId" argument must be provided in a non-interactive environment`);
        }
        channelId = await prompt_1.promptOnce({
            type: "input",
            message: "Please provide a URL-friendly name for the channel:",
            validate: (s) => s.length > 0,
        });
    }
    if (!channelId) {
        throw new error_1.FirebaseError(`"channelId" must not be empty`);
    }
    channelId = api_1.normalizeName(channelId);
    let channel;
    try {
        channel = await api_1.createChannel(projectId, site, channelId, expireTTL);
    }
    catch (e) {
        if (e.status == 409) {
            throw new error_1.FirebaseError(`Channel ${cli_color_1.bold(channelId)} already exists on site ${cli_color_1.bold(site)}. Deploy to ${cli_color_1.bold(channelId)} with: ${cli_color_1.yellow(`firebase hosting:channel:deploy ${channelId}`)}`, { original: e });
        }
        throw e;
    }
    try {
        await api_1.addAuthDomain(projectId, channel.url);
    }
    catch (e) {
        utils_1.logLabeledWarning(LOG_TAG, marked(`Unable to add channel domain to Firebase Auth. Visit the Firebase Console at ${utils_1.consoleUrl(projectId, "/authentication/providers")}`));
        logger.debug("[hosting] unable to add auth domain", e);
    }
    logger.info();
    utils_1.logLabeledSuccess(LOG_TAG, `Channel ${cli_color_1.bold(channelId)} has been created on site ${cli_color_1.bold(site)}.`);
    utils_1.logLabeledSuccess(LOG_TAG, `Channel ${cli_color_1.bold(channelId)} will expire at ${cli_color_1.bold(utils_1.datetimeString(new Date(channel.expireTime)))}.`);
    utils_1.logLabeledSuccess(LOG_TAG, `Channel URL: ${channel.url}`);
    logger.info();
    logger.info(`To deploy to this channel, use \`firebase hosting:channel:deploy ${channelId}\`.`);
    return channel;
});
