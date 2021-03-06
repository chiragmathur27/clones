"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtensionRegistry = exports.promptForAudienceConsent = exports.promptForUpdateWarnings = exports.getMinRequiredVersion = exports.getTargetVersion = exports.resolveRegistryEntry = exports.isOfficialSource = exports.resolveSourceUrl = exports.confirmUpdateWarning = void 0;
const _ = require("lodash");
const clc = require("cli-color");
const marked = require("marked");
const semver = require("semver");
const api = require("../api");
const error_1 = require("../error");
const logger = require("../logger");
const prompt_1 = require("../prompt");
const EXTENSIONS_REGISTRY_ENDPOINT = "/extensions.json";
const AUDIENCE_WARNING_MESSAGES = {
    "open-alpha": marked(`${clc.bold("Important")}: This extension is part of the ${clc.bold("preliminary-release program")} for extensions.\n Its functionality might change in backward-incompatible ways before its official release. Learn more: https://github.com/firebase/extensions/tree/master/.preliminary-release-extensions`),
    "closed-alpha": marked(`${clc.yellow.bold("Important")}: This extension is part of the ${clc.bold("Firebase Alpha program")}.\n This extension is strictly confidential, and its functionality might change in backward-incompatible ways before its official, public release. Learn more: https://dev-partners.googlesource.com/samples/firebase/extensions-alpha/+/refs/heads/master/README.md`),
};
async function confirmUpdateWarning(updateWarning) {
    logger.info(marked(updateWarning.description));
    if (updateWarning.action) {
        logger.info(marked(updateWarning.action));
    }
    const continueUpdate = await prompt_1.promptOnce({
        type: "confirm",
        message: "Do you wish to continue with this update?",
        default: false,
    });
    if (!continueUpdate) {
        throw new error_1.FirebaseError(`Update cancelled.`, { exit: 2 });
    }
}
exports.confirmUpdateWarning = confirmUpdateWarning;
function resolveSourceUrl(registryEntry, name, version) {
    const targetVersion = getTargetVersion(registryEntry, version);
    const sourceUrl = _.get(registryEntry, ["versions", targetVersion]);
    if (!sourceUrl) {
        throw new error_1.FirebaseError(`Could not find version ${clc.bold(version)} of extension ${clc.bold(name)}.`);
    }
    return sourceUrl;
}
exports.resolveSourceUrl = resolveSourceUrl;
function isOfficialSource(registryEntry, sourceUrl) {
    const versions = _.get(registryEntry, "versions");
    return _.includes(versions, sourceUrl);
}
exports.isOfficialSource = isOfficialSource;
async function resolveRegistryEntry(name) {
    const extensionsRegistry = await getExtensionRegistry();
    const registryEntry = _.get(extensionsRegistry, name);
    if (!registryEntry) {
        throw new error_1.FirebaseError(`Unable to find extension source named ${clc.bold(name)}.`);
    }
    return registryEntry;
}
exports.resolveRegistryEntry = resolveRegistryEntry;
function getTargetVersion(registryEntry, versionOrLabel) {
    const seekVersion = versionOrLabel || "latest";
    const versionFromLabel = _.get(registryEntry, ["labels", seekVersion]);
    return versionFromLabel || seekVersion;
}
exports.getTargetVersion = getTargetVersion;
function getMinRequiredVersion(registryEntry) {
    return _.get(registryEntry, ["labels", "minRequired"]);
}
exports.getMinRequiredVersion = getMinRequiredVersion;
async function promptForUpdateWarnings(registryEntry, startVersion, endVersion) {
    if (registryEntry.updateWarnings) {
        for (const targetRange in registryEntry.updateWarnings) {
            if (semver.satisfies(endVersion, targetRange)) {
                const updateWarnings = registryEntry.updateWarnings[targetRange];
                for (const updateWarning of updateWarnings) {
                    if (semver.satisfies(startVersion, updateWarning.from)) {
                        await module.exports.confirmUpdateWarning(updateWarning);
                        break;
                    }
                }
                break;
            }
        }
    }
}
exports.promptForUpdateWarnings = promptForUpdateWarnings;
async function promptForAudienceConsent(registryEntry) {
    let consent = true;
    if (registryEntry.audience && AUDIENCE_WARNING_MESSAGES[registryEntry.audience]) {
        logger.info(AUDIENCE_WARNING_MESSAGES[registryEntry.audience]);
        consent = await prompt_1.promptOnce({
            type: "confirm",
            message: "Do you acknowledge the status of this extension?",
            default: true,
        });
    }
    return consent;
}
exports.promptForAudienceConsent = promptForAudienceConsent;
async function getExtensionRegistry(onlyFeatured) {
    const res = await api.request("GET", EXTENSIONS_REGISTRY_ENDPOINT, {
        origin: api.firebaseExtensionsRegistryOrigin,
    });
    const extensions = _.get(res, "body.mods");
    if (onlyFeatured) {
        const featuredList = _.get(res, "body.featured.discover");
        return _.pickBy(extensions, (_entry, extensionName) => {
            return _.includes(featuredList, extensionName);
        });
    }
    return extensions;
}
exports.getExtensionRegistry = getExtensionRegistry;
