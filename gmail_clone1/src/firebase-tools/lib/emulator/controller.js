"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportEmulatorData = exports.startAll = exports.shouldStart = exports.filterEmulatorTargets = exports.cleanShutdown = exports.onExit = exports.exportOnExit = exports.startEmulator = void 0;
const _ = require("lodash");
const clc = require("cli-color");
const fs = require("fs");
const path = require("path");
const logger = require("../logger");
const track = require("../track");
const utils = require("../utils");
const registry_1 = require("./registry");
const types_1 = require("./types");
const constants_1 = require("./constants");
const functionsEmulator_1 = require("./functionsEmulator");
const functionsEmulatorUtils_1 = require("./functionsEmulatorUtils");
const auth_1 = require("./auth");
const databaseEmulator_1 = require("./databaseEmulator");
const firestoreEmulator_1 = require("./firestoreEmulator");
const hostingEmulator_1 = require("./hostingEmulator");
const error_1 = require("../error");
const getProjectId = require("../getProjectId");
const pubsubEmulator_1 = require("./pubsubEmulator");
const commandUtils = require("./commandUtils");
const hub_1 = require("./hub");
const hubExport_1 = require("./hubExport");
const ui_1 = require("./ui");
const loggingEmulator_1 = require("./loggingEmulator");
const dbRulesConfig = require("../database/rulesConfig");
const emulatorLogger_1 = require("./emulatorLogger");
const portUtils = require("./portUtils");
const hubClient_1 = require("./hubClient");
const prompt_1 = require("../prompt");
const rimraf = require("rimraf");
const commandUtils_1 = require("./commandUtils");
const fsutils_1 = require("../fsutils");
async function getAndCheckAddress(emulator, options) {
    let host = constants_1.Constants.normalizeHost(options.config.get(constants_1.Constants.getHostKey(emulator), constants_1.Constants.getDefaultHost(emulator)));
    if (host === "localhost" && utils.isRunningInWSL()) {
        host = "127.0.0.1";
    }
    const portVal = options.config.get(constants_1.Constants.getPortKey(emulator), undefined);
    let port;
    let findAvailablePort = false;
    if (portVal) {
        port = parseInt(portVal, 10);
    }
    else {
        port = constants_1.Constants.getDefaultPort(emulator);
        findAvailablePort = constants_1.FIND_AVAILBLE_PORT_BY_DEFAULT[emulator];
    }
    const loggerForEmulator = emulatorLogger_1.EmulatorLogger.forEmulator(emulator);
    const portOpen = await portUtils.checkPortOpen(port, host);
    if (!portOpen) {
        if (findAvailablePort) {
            const newPort = await portUtils.findAvailablePort(host, port);
            if (newPort != port) {
                loggerForEmulator.logLabeled("WARN", emulator, `${constants_1.Constants.description(emulator)} unable to start on port ${port}, starting on ${newPort} instead.`);
                port = newPort;
            }
        }
        else {
            await cleanShutdown();
            const description = constants_1.Constants.description(emulator);
            loggerForEmulator.logLabeled("WARN", emulator, `Port ${port} is not open on ${host}, could not start ${description}.`);
            loggerForEmulator.logLabeled("WARN", emulator, `To select a different host/port, specify that host/port in a firebase.json config file:
      {
        // ...
        "emulators": {
          "${emulator}": {
            "host": "${clc.yellow("HOST")}",
            "port": "${clc.yellow("PORT")}"
          }
        }
      }`);
            return utils.reject(`Could not start ${description}, port taken.`, {});
        }
    }
    if (portUtils.isRestricted(port)) {
        const suggested = portUtils.suggestUnrestricted(port);
        loggerForEmulator.logLabeled("WARN", emulator, `Port ${port} is restricted by some web browsers, including Chrome. You may want to choose a different port such as ${suggested}.`);
    }
    return { host, port };
}
async function startEmulator(instance) {
    const name = instance.getName();
    track("emulators:start", name);
    await registry_1.EmulatorRegistry.start(instance);
}
exports.startEmulator = startEmulator;
async function exportOnExit(options) {
    const exportOnExitDir = options.exportOnExit;
    if (exportOnExitDir) {
        try {
            utils.logBullet(`Automatically exporting data using ${commandUtils_1.FLAG_EXPORT_ON_EXIT_NAME} "${exportOnExitDir}" ` +
                "please wait for the export to finish...");
            await exportEmulatorData(exportOnExitDir, options);
        }
        catch (e) {
            utils.logWarning(e);
            utils.logWarning(`Automatic export to "${exportOnExitDir}" failed, going to exit now...`);
        }
    }
}
exports.exportOnExit = exportOnExit;
async function onExit(options) {
    await exportOnExit(options);
}
exports.onExit = onExit;
async function cleanShutdown() {
    emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.HUB).logLabeled("BULLET", "emulators", "Shutting down emulators.");
    await registry_1.EmulatorRegistry.stopAll();
}
exports.cleanShutdown = cleanShutdown;
function filterEmulatorTargets(options) {
    let targets = types_1.ALL_SERVICE_EMULATORS.filter((e) => {
        return options.config.has(e) || options.config.has(`emulators.${e}`);
    });
    if (options.only) {
        targets = _.intersection(targets, options.only.split(","));
    }
    return targets;
}
exports.filterEmulatorTargets = filterEmulatorTargets;
function shouldStart(options, name) {
    if (name === types_1.Emulators.HUB) {
        return !!options.project;
    }
    const targets = filterEmulatorTargets(options);
    const emulatorInTargets = targets.indexOf(name) >= 0;
    if (name === types_1.Emulators.UI) {
        if (options.ui) {
            return true;
        }
        if (options.config.get("emulators.ui.enabled") === false) {
            return false;
        }
        return (!!options.project && targets.some((target) => types_1.EMULATORS_SUPPORTED_BY_UI.indexOf(target) >= 0));
    }
    if (name === types_1.Emulators.FUNCTIONS &&
        emulatorInTargets &&
        !options.config.get("functions.source")) {
        emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.FUNCTIONS).logLabeled("WARN", "functions", `The functions emulator is configured but there is no functions source directory. Have you run ${clc.bold("firebase init functions")}?`);
        return false;
    }
    if (name === types_1.Emulators.HOSTING && emulatorInTargets && !options.config.get("hosting")) {
        emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.HOSTING).logLabeled("WARN", "hosting", `The hosting emulator is configured but there is no hosting configuration. Have you run ${clc.bold("firebase init hosting")}?`);
        return false;
    }
    return emulatorInTargets;
}
exports.shouldStart = shouldStart;
function findExportMetadata(importPath) {
    const pathIsDirectory = fs.lstatSync(importPath).isDirectory();
    if (!pathIsDirectory) {
        return;
    }
    const importFilePath = path.join(importPath, hubExport_1.HubExport.METADATA_FILE_NAME);
    if (fsutils_1.fileExistsSync(importFilePath)) {
        return JSON.parse(fs.readFileSync(importFilePath, "utf8").toString());
    }
    const fileList = fs.readdirSync(importPath);
    const firestoreMetadataFile = fileList.find((f) => f.endsWith(".overall_export_metadata"));
    if (firestoreMetadataFile) {
        const metadata = {
            version: hub_1.EmulatorHub.CLI_VERSION,
            firestore: {
                version: "prod",
                path: importPath,
                metadata_file: `${importPath}/${firestoreMetadataFile}`,
            },
        };
        emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.FIRESTORE).logLabeled("BULLET", "firestore", `Detected non-emulator Firestore export at ${importPath}`);
        return metadata;
    }
    const rtdbDataFile = fileList.find((f) => f.endsWith(".json"));
    if (rtdbDataFile) {
        const metadata = {
            version: hub_1.EmulatorHub.CLI_VERSION,
            database: {
                version: "prod",
                path: importPath,
            },
        };
        emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.DATABASE).logLabeled("BULLET", "firestore", `Detected non-emulator Database export at ${importPath}`);
        return metadata;
    }
}
async function startAll(options, noUi = false) {
    const targets = filterEmulatorTargets(options);
    options.targets = targets;
    const projectId = getProjectId(options, true);
    emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.HUB).logLabeled("BULLET", "emulators", `Starting emulators: ${targets.join(", ")}`);
    if (options.only) {
        const requested = options.only.split(",");
        const ignored = _.difference(requested, targets);
        for (const name of ignored) {
            if (types_1.isEmulator(name)) {
                emulatorLogger_1.EmulatorLogger.forEmulator(name).logLabeled("WARN", name, `Not starting the ${clc.bold(name)} emulator, make sure you have run ${clc.bold("firebase init")}.`);
            }
            else {
                throw new error_1.FirebaseError(`${name} is not a valid emulator name, valid options are: ${JSON.stringify(types_1.ALL_SERVICE_EMULATORS)}`, { exit: 1 });
            }
        }
    }
    if (shouldStart(options, types_1.Emulators.HUB)) {
        const hubAddr = await getAndCheckAddress(types_1.Emulators.HUB, options);
        const hub = new hub_1.EmulatorHub(Object.assign({ projectId }, hubAddr));
        await startEmulator(hub);
    }
    let exportMetadata = {
        version: "unknown",
    };
    if (options.import) {
        const importDir = path.resolve(options.import);
        const foundMetadata = findExportMetadata(importDir);
        if (foundMetadata) {
            exportMetadata = foundMetadata;
        }
        else {
            emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.HUB).logLabeled("WARN", "emulators", `Could not find import/export metadata file, ${clc.bold("skipping data import!")}`);
        }
    }
    if (shouldStart(options, types_1.Emulators.FUNCTIONS)) {
        const functionsLogger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.FUNCTIONS);
        const functionsAddr = await getAndCheckAddress(types_1.Emulators.FUNCTIONS, options);
        const projectId = getProjectId(options, false);
        const functionsDir = path.join(options.extensionDir || options.config.projectDir, options.config.get("functions.source"));
        let inspectFunctions;
        if (options.inspectFunctions) {
            inspectFunctions = commandUtils.parseInspectionPort(options);
            functionsLogger.logLabeled("WARN", "functions", `You are running the functions emulator in debug mode (port=${inspectFunctions}). This means that functions will execute in sequence rather than in parallel.`);
        }
        const emulatorsNotRunning = types_1.ALL_SERVICE_EMULATORS.filter((e) => {
            return e !== types_1.Emulators.FUNCTIONS && !shouldStart(options, e);
        });
        if (emulatorsNotRunning.length > 0) {
            functionsLogger.logLabeled("WARN", "functions", `The following emulators are not running, calls to these services from the Functions emulator will affect production: ${clc.bold(emulatorsNotRunning.join(", "))}`);
        }
        const functionsEmulator = new functionsEmulator_1.FunctionsEmulator({
            projectId,
            functionsDir,
            host: functionsAddr.host,
            port: functionsAddr.port,
            debugPort: inspectFunctions,
            env: Object.assign({}, options.extensionEnv),
            predefinedTriggers: options.extensionTriggers,
            nodeMajorVersion: functionsEmulatorUtils_1.parseRuntimeVersion(options.extensionNodeVersion || options.config.get("functions.runtime")),
        });
        await startEmulator(functionsEmulator);
    }
    if (shouldStart(options, types_1.Emulators.FIRESTORE)) {
        const firestoreLogger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.FIRESTORE);
        const firestoreAddr = await getAndCheckAddress(types_1.Emulators.FIRESTORE, options);
        const args = {
            host: firestoreAddr.host,
            port: firestoreAddr.port,
            projectId,
            auto_download: true,
        };
        if (exportMetadata.firestore) {
            const importDirAbsPath = path.resolve(options.import);
            const exportMetadataFilePath = path.resolve(importDirAbsPath, exportMetadata.firestore.metadata_file);
            firestoreLogger.logLabeled("BULLET", "firestore", `Importing data from ${exportMetadataFilePath}`);
            args.seed_from_export = exportMetadataFilePath;
        }
        const config = options.config;
        const rulesLocalPath = config.get("firestore.rules");
        let rulesFileFound = false;
        if (rulesLocalPath) {
            const rules = config.path(rulesLocalPath);
            rulesFileFound = fs.existsSync(rules);
            if (rulesFileFound) {
                args.rules = rules;
            }
            else {
                firestoreLogger.logLabeled("WARN", "firestore", `Cloud Firestore rules file ${clc.bold(rules)} specified in firebase.json does not exist.`);
            }
        }
        else {
            firestoreLogger.logLabeled("WARN", "firestore", "Did not find a Cloud Firestore rules file specified in a firebase.json config file.");
        }
        if (!rulesFileFound) {
            firestoreLogger.logLabeled("WARN", "firestore", "The emulator will default to allowing all reads and writes. Learn more about this option: https://firebase.google.com/docs/emulator-suite/install_and_configure#security_rules_configuration.");
        }
        const firestoreEmulator = new firestoreEmulator_1.FirestoreEmulator(args);
        await startEmulator(firestoreEmulator);
    }
    if (shouldStart(options, types_1.Emulators.DATABASE)) {
        const databaseLogger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.DATABASE);
        const databaseAddr = await getAndCheckAddress(types_1.Emulators.DATABASE, options);
        const args = {
            host: databaseAddr.host,
            port: databaseAddr.port,
            projectId,
            auto_download: true,
        };
        const rc = dbRulesConfig.normalizeRulesConfig(dbRulesConfig.getRulesConfig(projectId, options), options);
        logger.debug("database rules config: ", JSON.stringify(rc));
        args.rules = rc;
        if (rc.length === 0) {
            databaseLogger.logLabeled("WARN", "database", "Did not find a Realtime Database rules file specified in a firebase.json config file. The emulator will default to allowing all reads and writes. Learn more about this option: https://firebase.google.com/docs/emulator-suite/install_and_configure#security_rules_configuration.");
        }
        else {
            for (const c of rc) {
                const rules = c.rules;
                if (!fs.existsSync(rules)) {
                    databaseLogger.logLabeled("WARN", "database", `Realtime Database rules file ${clc.bold(rules)} specified in firebase.json does not exist.`);
                }
            }
        }
        const databaseEmulator = new databaseEmulator_1.DatabaseEmulator(args);
        await startEmulator(databaseEmulator);
        if (exportMetadata.database) {
            const importDirAbsPath = path.resolve(options.import);
            const databaseExportDir = path.resolve(importDirAbsPath, exportMetadata.database.path);
            const files = fs.readdirSync(databaseExportDir).filter((f) => f.endsWith(".json"));
            for (const f of files) {
                const fPath = path.join(databaseExportDir, f);
                const ns = path.basename(f, ".json");
                await databaseEmulator.importData(ns, fPath);
            }
        }
    }
    if (shouldStart(options, types_1.Emulators.AUTH)) {
        if (!projectId) {
            throw new error_1.FirebaseError(`Cannot start the ${constants_1.Constants.description(types_1.Emulators.AUTH)} without a project: run 'firebase init' or provide the --project flag`);
        }
        const authAddr = await getAndCheckAddress(types_1.Emulators.AUTH, options);
        const authEmulator = new auth_1.AuthEmulator({
            host: authAddr.host,
            port: authAddr.port,
            projectId,
        });
        await startEmulator(authEmulator);
        if (exportMetadata.auth) {
            const importDirAbsPath = path.resolve(options.import);
            const authExportDir = path.resolve(importDirAbsPath, exportMetadata.auth.path);
            await authEmulator.importData(authExportDir, projectId);
        }
    }
    if (shouldStart(options, types_1.Emulators.PUBSUB)) {
        if (!projectId) {
            throw new error_1.FirebaseError("Cannot start the Pub/Sub emulator without a project: run 'firebase init' or provide the --project flag");
        }
        const pubsubAddr = await getAndCheckAddress(types_1.Emulators.PUBSUB, options);
        const pubsubEmulator = new pubsubEmulator_1.PubsubEmulator({
            host: pubsubAddr.host,
            port: pubsubAddr.port,
            projectId,
            auto_download: true,
        });
        await startEmulator(pubsubEmulator);
    }
    if (shouldStart(options, types_1.Emulators.HOSTING)) {
        const hostingAddr = await getAndCheckAddress(types_1.Emulators.HOSTING, options);
        const hostingEmulator = new hostingEmulator_1.HostingEmulator({
            host: hostingAddr.host,
            port: hostingAddr.port,
            options,
        });
        await startEmulator(hostingEmulator);
    }
    if (!noUi && shouldStart(options, types_1.Emulators.UI)) {
        const loggingAddr = await getAndCheckAddress(types_1.Emulators.LOGGING, options);
        const loggingEmulator = new loggingEmulator_1.LoggingEmulator({
            host: loggingAddr.host,
            port: loggingAddr.port,
        });
        await startEmulator(loggingEmulator);
        const uiAddr = await getAndCheckAddress(types_1.Emulators.UI, options);
        const ui = new ui_1.EmulatorUI(Object.assign({ projectId, auto_download: true }, uiAddr));
        await startEmulator(ui);
    }
    const running = registry_1.EmulatorRegistry.listRunning();
    for (const name of running) {
        const instance = registry_1.EmulatorRegistry.get(name);
        if (instance) {
            await instance.connect();
        }
    }
}
exports.startAll = startAll;
async function exportEmulatorData(exportPath, options) {
    const projectId = options.project;
    if (!projectId) {
        throw new error_1.FirebaseError("Could not determine project ID, make sure you're running in a Firebase project directory or add the --project flag.", { exit: 1 });
    }
    const hubClient = new hubClient_1.EmulatorHubClient(projectId);
    if (!hubClient.foundHub()) {
        throw new error_1.FirebaseError(`Did not find any running emulators for project ${clc.bold(projectId)}.`, { exit: 1 });
    }
    try {
        await hubClient.getStatus();
    }
    catch (e) {
        const filePath = hub_1.EmulatorHub.getLocatorFilePath(projectId);
        throw new error_1.FirebaseError(`The emulator hub for ${projectId} did not respond to a status check. If this error continues try shutting down all running emulators and deleting the file ${filePath}`, { exit: 1 });
    }
    utils.logBullet(`Found running emulator hub for project ${clc.bold(projectId)} at ${hubClient.origin}`);
    const exportAbsPath = path.resolve(exportPath);
    if (!fs.existsSync(exportAbsPath)) {
        utils.logBullet(`Creating export directory ${exportAbsPath}`);
        fs.mkdirSync(exportAbsPath);
    }
    const existingMetadata = hubExport_1.HubExport.readMetadata(exportAbsPath);
    if (existingMetadata && !(options.force || options.exportOnExit)) {
        if (options.noninteractive) {
            throw new error_1.FirebaseError("Export already exists in the target directory, re-run with --force to overwrite.", { exit: 1 });
        }
        const prompt = await prompt_1.promptOnce({
            type: "confirm",
            message: `The directory ${exportAbsPath} already contains export data. Exporting again to the same directory will overwrite all data. Do you want to continue?`,
            default: false,
        });
        if (!prompt) {
            throw new error_1.FirebaseError("Command aborted", { exit: 1 });
        }
    }
    if (existingMetadata) {
        if (existingMetadata.firestore) {
            const firestorePath = path.join(exportAbsPath, existingMetadata.firestore.path);
            utils.logBullet(`Deleting directory ${firestorePath}`);
            rimraf.sync(firestorePath);
        }
    }
    utils.logBullet(`Exporting data to: ${exportAbsPath}`);
    try {
        await hubClient.postExport(exportAbsPath);
    }
    catch (e) {
        throw new error_1.FirebaseError("Export request failed, see emulator logs for more information.", {
            exit: 1,
            original: e,
        });
    }
    utils.logSuccess("Export complete");
}
exports.exportEmulatorData = exportEmulatorData;
