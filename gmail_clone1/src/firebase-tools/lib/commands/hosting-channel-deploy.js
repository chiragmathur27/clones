"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_color_1 = require("cli-color");
const command_1 = require("../command");
const error_1 = require("../error");
const api_1 = require("../hosting/api");
const normalizedHostingConfigs_1 = require("../hosting/normalizedHostingConfigs");
const requirePermissions_1 = require("../requirePermissions");
const deploy = require("../deploy");
const getProjectId = require("../getProjectId");
const logger = require("../logger");
const requireConfig = require("../requireConfig");
const expireUtils_1 = require("../hosting/expireUtils");
const utils_1 = require("../utils");
const marked = require("marked");
const requireHostingSite_1 = require("../requireHostingSite");
const LOG_TAG = "hosting:channel";
exports.default = new command_1.Command("hosting:channel:deploy [channelId]")
    .description("deploy to a specific Firebase Hosting channel")
    .option("-e, --expires <duration>", "duration string (e.g. 12h, 30d) for channel expiration, max 30d; defaults to 7d")
    .option("--only <target1,target2...>", "only create previews for specified targets")
    .option("--open", "open a browser to the channel after deploying")
    .option("--no-authorized-domains", "do not sync channel domains with Firebase Auth")
    .before(requireConfig)
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.update"])
    .before(requireHostingSite_1.requireHostingSite)
    .action(async (channelId, options) => {
    const projectId = getProjectId(options);
    if (options.open) {
        throw new error_1.FirebaseError("open is not yet implemented");
    }
    if (options["no-authorized-domains"]) {
        throw new error_1.FirebaseError("no-authorized-domains is not yet implemented");
    }
    let expireTTL = expireUtils_1.DEFAULT_DURATION;
    if (options.expires) {
        expireTTL = expireUtils_1.calculateChannelExpireTTL(options.expires);
        logger.debug(`Expires TTL: ${expireTTL}`);
    }
    if (!channelId) {
        throw new error_1.FirebaseError("channelID is currently required");
    }
    channelId = api_1.normalizeName(channelId);
    if (channelId.toLowerCase().trim() === "live") {
        throw new error_1.FirebaseError(`Cannot deploy to the ${cli_color_1.bold("live")} channel using this command. Please use ${cli_color_1.bold(cli_color_1.yellow("firebase deploy"))} instead.`);
    }
    if (options.only) {
        options.only = options.only
            .split(",")
            .map((o) => `hosting:${o}`)
            .join(",");
    }
    const sites = normalizedHostingConfigs_1.normalizedHostingConfigs(options, {
        resolveTargets: true,
    }).map((cfg) => ({ site: cfg.site, target: cfg.target, url: "", expireTime: "" }));
    await Promise.all(sites.map(async (siteInfo) => {
        const site = siteInfo.site;
        let chan = await api_1.getChannel(projectId, site, channelId);
        logger.debug("[hosting] found existing channel for site", site, chan);
        if (chan) {
            const channelExpires = Boolean(chan.expireTime);
            if (!channelExpires && options.expires) {
                chan = await api_1.updateChannelTtl(projectId, site, channelId, expireTTL);
            }
            else if (channelExpires) {
                const channelTimeRemaining = new Date(chan.expireTime).getTime() - Date.now();
                if (options.expires || channelTimeRemaining < expireTTL) {
                    chan = await api_1.updateChannelTtl(projectId, site, channelId, expireTTL);
                    logger.debug("[hosting] updated TTL for existing channel for site", site, chan);
                }
            }
        }
        else {
            chan = await api_1.createChannel(projectId, site, channelId, expireTTL);
            logger.debug("[hosting] created new channnel for site", site, chan);
            utils_1.logLabeledSuccess(LOG_TAG, `Channel ${cli_color_1.bold(channelId)} has been created on site ${cli_color_1.bold(site)}.`);
            try {
                await api_1.addAuthDomain(projectId, chan.url);
            }
            catch (e) {
                utils_1.logLabeledWarning(LOG_TAG, marked(`Unable to add channel domain to Firebase Auth. Visit the Firebase Console at ${utils_1.consoleUrl(projectId, "/authentication/providers")}`));
                logger.debug("[hosting] unable to add auth domain", e);
            }
        }
        try {
            await api_1.cleanAuthState(projectId, site);
        }
        catch (e) {
            utils_1.logLabeledWarning(LOG_TAG, "Unable to sync Firebase Auth state.");
            logger.debug("[hosting] unable to sync auth domain", e);
        }
        siteInfo.url = chan.url;
        siteInfo.expireTime = chan.expireTime;
        return;
    }));
    await deploy(["hosting"], options, { hostingChannel: channelId });
    logger.info();
    const deploys = {};
    sites.forEach((d) => {
        deploys[d.target || d.site] = d;
        let expires = "";
        if (d.expireTime) {
            expires = `[expires ${cli_color_1.bold(utils_1.datetimeString(new Date(d.expireTime)))}]`;
        }
        utils_1.logLabeledSuccess(LOG_TAG, `Channel URL (${cli_color_1.bold(d.site || d.target)}): ${d.url} ${expires}`);
    });
    return deploys;
});
