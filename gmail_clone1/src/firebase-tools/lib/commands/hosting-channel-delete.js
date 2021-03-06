"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_color_1 = require("cli-color");
const command_1 = require("../command");
const api_1 = require("../hosting/api");
const requirePermissions_1 = require("../requirePermissions");
const getProjectId = require("../getProjectId");
const requireConfig = require("../requireConfig");
const utils_1 = require("../utils");
const prompt_1 = require("../prompt");
const requireHostingSite_1 = require("../requireHostingSite");
exports.default = new command_1.Command("hosting:channel:delete <channelId>")
    .description("delete a Firebase Hosting channel")
    .option("--site <siteId>", "site in which the channel exists")
    .option("-f, --force", "delete without confirmation")
    .before(requireConfig)
    .before(requirePermissions_1.requirePermissions, ["firebasehosting.sites.update"])
    .before(requireHostingSite_1.requireHostingSite)
    .action(async (channelId, options) => {
    const projectId = getProjectId(options);
    const siteId = options.site;
    channelId = api_1.normalizeName(channelId);
    const channel = await api_1.getChannel(projectId, siteId, channelId);
    let confirmed = Boolean(options.force);
    if (!confirmed) {
        confirmed = await prompt_1.promptOnce({
            message: `Are you sure you want to delete the Hosting Channel ${cli_color_1.underline(channelId)} for site ${cli_color_1.underline(siteId)}?`,
            type: "confirm",
            default: false,
        });
    }
    if (!confirmed) {
        return;
    }
    await api_1.deleteChannel(projectId, siteId, channelId);
    if (channel) {
        await api_1.removeAuthDomain(projectId, channel.url);
    }
    utils_1.logLabeledSuccess("hosting:channels", `Successfully deleted channel ${cli_color_1.bold(channelId)} for site ${cli_color_1.bold(siteId)}.`);
});
