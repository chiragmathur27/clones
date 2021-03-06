"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.implicitInit = void 0;
const _ = require("lodash");
const clc = require("cli-color");
const fs = require("fs");
const fetchWebSetup_1 = require("../fetchWebSetup");
const utils = require("../utils");
const logger = require("../logger");
const registry_1 = require("../emulator/registry");
const types_1 = require("../emulator/types");
const INIT_TEMPLATE = fs.readFileSync(__dirname + "/../../templates/hosting/init.js", "utf8");
async function implicitInit(options) {
    let config;
    try {
        config = await fetchWebSetup_1.fetchWebSetup(options);
    }
    catch (e) {
        logger.debug("fetchWebSetup error: " + e);
        const statusCode = _.get(e, "context.response.statusCode");
        if (statusCode === 403) {
            utils.logLabeledWarning("hosting", `Authentication error when trying to fetch your current web app configuration, have you run ${clc.bold("firebase login")}?`);
        }
    }
    if (!config) {
        config = fetchWebSetup_1.getCachedWebSetup(options);
        if (config) {
            utils.logLabeledWarning("hosting", "Using web app configuration from cache.");
        }
    }
    if (!config) {
        config = undefined;
        utils.logLabeledWarning("hosting", "Could not fetch web app configuration and there is no cached configuration on this machine. " +
            "Check your internet connection and make sure you are authenticated. " +
            "To continue, you must call firebase.initializeApp({...}) in your code before using Firebase.");
    }
    const configJson = JSON.stringify(config, null, 2);
    const emulators = {};
    for (const e of types_1.EMULATORS_SUPPORTED_BY_USE_EMULATOR) {
        const info = registry_1.EmulatorRegistry.getInfo(e);
        if (info) {
            const host = info.host.includes(":") ? `[${info.host}]` : info.host;
            emulators[e] = {
                host,
                port: info.port,
            };
        }
    }
    const emulatorsJson = JSON.stringify(emulators, null, 2);
    const js = INIT_TEMPLATE.replace("/*--CONFIG--*/", `var firebaseConfig = ${configJson};`).replace("/*--EMULATORS--*/", "var firebaseEmulators = undefined;");
    const emulatorsJs = INIT_TEMPLATE.replace("/*--CONFIG--*/", `var firebaseConfig = ${configJson};`).replace("/*--EMULATORS--*/", `var firebaseEmulators = ${emulatorsJson};`);
    return {
        js,
        emulatorsJs,
        json: configJson,
    };
}
exports.implicitInit = implicitInit;
