"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thirtyDaysFromNow = exports.isRunningInWSL = exports.isCloudEnvironment = exports.datetimeString = exports.createDestroyer = exports.promiseWithSpinner = exports.setupLoggers = exports.tryParse = exports.tryStringify = exports.promiseProps = exports.promiseWhile = exports.promiseAllSettled = exports.getFunctionsEventProvider = exports.endpoint = exports.makeActiveProject = exports.streamToString = exports.stringToStream = exports.explainStdin = exports.reject = exports.logLabeledWarning = exports.logWarning = exports.logLabeledBullet = exports.logBullet = exports.logLabeledSuccess = exports.logSuccess = exports.addSubdomain = exports.addDatabaseNamespace = exports.getDatabaseViewDataUrl = exports.getDatabaseUrl = exports.envOverride = exports.getInheritedOption = exports.consoleUrl = exports.envOverrides = void 0;
const _ = require("lodash");
const url = require("url");
const clc = require("cli-color");
const ora = require("ora");
const process = require("process");
const stream_1 = require("stream");
const winston = require("winston");
const triple_beam_1 = require("triple-beam");
const ansiStrip = require("cli-color/strip");
const configstore_1 = require("./configstore");
const error_1 = require("./error");
const logger = require("./logger");
const IS_WINDOWS = process.platform === "win32";
const SUCCESS_CHAR = IS_WINDOWS ? "+" : "✔";
const WARNING_CHAR = IS_WINDOWS ? "!" : "⚠";
const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;
exports.envOverrides = [];
function consoleUrl(project, path) {
    const api = require("./api");
    return `${api.consoleOrigin}/project/${project}${path}`;
}
exports.consoleUrl = consoleUrl;
function getInheritedOption(options, key) {
    let target = options;
    while (target) {
        if (_.has(target, key)) {
            return target[key];
        }
        target = target.parent;
    }
}
exports.getInheritedOption = getInheritedOption;
function envOverride(envname, value, coerce) {
    const currentEnvValue = process.env[envname];
    if (currentEnvValue && currentEnvValue.length) {
        exports.envOverrides.push(envname);
        if (coerce) {
            try {
                return coerce(currentEnvValue, value);
            }
            catch (e) {
                return value;
            }
        }
        return currentEnvValue;
    }
    return value;
}
exports.envOverride = envOverride;
function getDatabaseUrl(origin, namespace, pathname) {
    const withPath = url.resolve(origin, pathname);
    return addDatabaseNamespace(withPath, namespace);
}
exports.getDatabaseUrl = getDatabaseUrl;
function getDatabaseViewDataUrl(origin, project, namespace, pathname) {
    const urlObj = new url.URL(origin);
    if (urlObj.hostname.includes("firebaseio.com") ||
        urlObj.hostname.includes("firebasedatabase.app")) {
        return consoleUrl(project, `/database/${namespace}/data${pathname}`);
    }
    else {
        return getDatabaseUrl(origin, namespace, pathname + ".json");
    }
}
exports.getDatabaseViewDataUrl = getDatabaseViewDataUrl;
function addDatabaseNamespace(origin, namespace) {
    const urlObj = new url.URL(origin);
    if (urlObj.hostname.includes(namespace)) {
        return urlObj.href;
    }
    if (urlObj.hostname.includes("firebaseio.com") ||
        urlObj.hostname.includes("firebasedatabase.app")) {
        return addSubdomain(origin, namespace);
    }
    else {
        urlObj.searchParams.set("ns", namespace);
        return urlObj.href;
    }
}
exports.addDatabaseNamespace = addDatabaseNamespace;
function addSubdomain(origin, subdomain) {
    return origin.replace("//", `//${subdomain}.`);
}
exports.addSubdomain = addSubdomain;
function logSuccess(message, type = "info", data = undefined) {
    logger[type](clc.green.bold(`${SUCCESS_CHAR} `), message, data);
}
exports.logSuccess = logSuccess;
function logLabeledSuccess(label, message, type = "info", data = undefined) {
    logger[type](clc.green.bold(`${SUCCESS_CHAR}  ${label}:`), message, data);
}
exports.logLabeledSuccess = logLabeledSuccess;
function logBullet(message, type = "info", data = undefined) {
    logger[type](clc.cyan.bold("i "), message, data);
}
exports.logBullet = logBullet;
function logLabeledBullet(label, message, type = "info", data = undefined) {
    logger[type](clc.cyan.bold(`i  ${label}:`), message, data);
}
exports.logLabeledBullet = logLabeledBullet;
function logWarning(message, type = "warn", data = undefined) {
    logger[type](clc.yellow.bold(`${WARNING_CHAR} `), message, data);
}
exports.logWarning = logWarning;
function logLabeledWarning(label, message, type = "warn", data = undefined) {
    logger[type](clc.yellow.bold(`${WARNING_CHAR}  ${label}:`), message, data);
}
exports.logLabeledWarning = logLabeledWarning;
function reject(message, options) {
    return Promise.reject(new error_1.FirebaseError(message, options));
}
exports.reject = reject;
function explainStdin() {
    if (IS_WINDOWS) {
        throw new error_1.FirebaseError("STDIN input is not available on Windows.", {
            exit: 1,
        });
    }
    if (process.stdin.isTTY) {
        logger.info(clc.bold("Note:"), "Reading STDIN. Type JSON data and then press Ctrl-D");
    }
}
exports.explainStdin = explainStdin;
function stringToStream(text) {
    if (!text) {
        return undefined;
    }
    const s = new stream_1.Readable();
    s.push(text);
    s.push(null);
    return s;
}
exports.stringToStream = stringToStream;
function streamToString(s) {
    return new Promise((resolve, reject) => {
        let b = "";
        s.on("error", reject);
        s.on("data", (d) => (b += `${d}`));
        s.once("end", () => resolve(b));
    });
}
exports.streamToString = streamToString;
function makeActiveProject(projectDir, newActive) {
    const activeProjects = configstore_1.configstore.get("activeProjects") || {};
    if (newActive) {
        activeProjects[projectDir] = newActive;
    }
    else {
        _.unset(activeProjects, projectDir);
    }
    configstore_1.configstore.set("activeProjects", activeProjects);
}
exports.makeActiveProject = makeActiveProject;
function endpoint(parts) {
    return `/${_.join(parts, "/")}`;
}
exports.endpoint = endpoint;
function getFunctionsEventProvider(eventType) {
    const parts = eventType.split("/");
    if (parts.length > 1) {
        const provider = _.last(parts[1].split("."));
        return _.capitalize(provider);
    }
    if (eventType.match(/google.pubsub/)) {
        return "PubSub";
    }
    else if (eventType.match(/google.storage/)) {
        return "Storage";
    }
    else if (eventType.match(/google.analytics/)) {
        return "Analytics";
    }
    else if (eventType.match(/google.firebase.database/)) {
        return "Database";
    }
    else if (eventType.match(/google.firebase.auth/)) {
        return "Auth";
    }
    else if (eventType.match(/google.firebase.crashlytics/)) {
        return "Crashlytics";
    }
    else if (eventType.match(/google.firestore/)) {
        return "Firestore";
    }
    return _.capitalize(eventType.split(".")[1]);
}
exports.getFunctionsEventProvider = getFunctionsEventProvider;
function promiseAllSettled(promises) {
    const wrappedPromises = _.map(promises, async (p) => {
        try {
            const val = await Promise.resolve(p);
            return { state: "fulfilled", value: val };
        }
        catch (err) {
            return { state: "rejected", reason: err };
        }
    });
    return Promise.all(wrappedPromises);
}
exports.promiseAllSettled = promiseAllSettled;
async function promiseWhile(action, check, interval = 2500) {
    return new Promise((resolve, promiseReject) => {
        const run = async () => {
            try {
                const res = await action();
                if (check(res)) {
                    return resolve(res);
                }
                setTimeout(run, interval);
            }
            catch (err) {
                return promiseReject(err);
            }
        };
        run();
    });
}
exports.promiseWhile = promiseWhile;
async function promiseProps(obj) {
    const resultObj = {};
    const promises = _.keys(obj).map(async (key) => {
        const r = await Promise.resolve(obj[key]);
        resultObj[key] = r;
    });
    return Promise.all(promises).then(() => resultObj);
}
exports.promiseProps = promiseProps;
function tryStringify(value) {
    if (typeof value === "string") {
        return value;
    }
    try {
        return JSON.stringify(value);
    }
    catch (_a) {
        return value;
    }
}
exports.tryStringify = tryStringify;
function tryParse(value) {
    if (typeof value !== "string") {
        return value;
    }
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return value;
    }
}
exports.tryParse = tryParse;
function setupLoggers() {
    if (process.env.DEBUG) {
        logger.add(new winston.transports.Console({
            level: "debug",
            format: winston.format.printf((info) => {
                const segments = [info.message, ...(info[triple_beam_1.SPLAT] || [])].map(tryStringify);
                return `${ansiStrip(segments.join(" "))}`;
            }),
        }));
    }
    else if (process.env.IS_FIREBASE_CLI) {
        logger.add(new winston.transports.Console({
            level: "info",
            format: winston.format.printf((info) => [info.message, ...(info[triple_beam_1.SPLAT] || [])]
                .filter((chunk) => typeof chunk == "string")
                .join(" ")),
        }));
    }
}
exports.setupLoggers = setupLoggers;
async function promiseWithSpinner(action, message) {
    const spinner = ora(message).start();
    let data;
    try {
        data = await action();
        spinner.succeed();
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
    return data;
}
exports.promiseWithSpinner = promiseWithSpinner;
function createDestroyer(server) {
    const connections = new Set();
    server.on("connection", (conn) => {
        connections.add(conn);
        conn.once("close", () => connections.delete(conn));
    });
    let destroyPromise = undefined;
    return function destroyer() {
        if (!destroyPromise) {
            destroyPromise = new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err)
                        return reject(err);
                    resolve();
                });
                connections.forEach((socket) => socket.destroy());
            });
        }
        return destroyPromise;
    };
}
exports.createDestroyer = createDestroyer;
function datetimeString(d) {
    const day = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
    const time = `${d
        .getHours()
        .toString()
        .padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${d
        .getSeconds()
        .toString()
        .padStart(2, "0")}`;
    return `${day} ${time}`;
}
exports.datetimeString = datetimeString;
function isCloudEnvironment() {
    return !!process.env.CODESPACES;
}
exports.isCloudEnvironment = isCloudEnvironment;
function isRunningInWSL() {
    return !!process.env.WSL_DISTRO_NAME;
}
exports.isRunningInWSL = isRunningInWSL;
function thirtyDaysFromNow() {
    return new Date(Date.now() + THIRTY_DAYS_IN_MILLISECONDS);
}
exports.thirtyDaysFromNow = thirtyDaysFromNow;
