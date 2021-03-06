"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmInstallInstance = exports.getSourceOrigin = exports.instanceIdExists = exports.promptForRepeatInstance = exports.promptForOfficialExtension = exports.confirmExtensionVersion = exports.getExtensionSourceFromName = exports.createSourceFromLocation = exports.publishExtensionVersionFromLocalSource = exports.ensureExtensionsApiEnabled = exports.promptForValidInstanceId = exports.validateSpec = exports.validateCommandLineParams = exports.populateDefaultParams = exports.substituteParams = exports.getFirebaseProjectParams = exports.getDBInstanceFromURL = exports.resourceTypeToNiceName = exports.AUTOPOULATED_PARAM_PLACEHOLDERS = exports.EXTENSIONS_BUCKET_NAME = exports.urlRegex = exports.validLicenses = exports.logPrefix = exports.SourceOrigin = exports.SpecParamType = void 0;
const _ = require("lodash");
const clc = require("cli-color");
const ora = require("ora");
const semver = require("semver");
const fs = require("fs");
const marked = require("marked");
const api_1 = require("../api");
const archiveDirectory_1 = require("../archiveDirectory");
const utils_1 = require("./utils");
const functionsConfig_1 = require("../functionsConfig");
const resolveSource_1 = require("./resolveSource");
const error_1 = require("../error");
const askUserForParam_1 = require("./askUserForParam");
const ensureApiEnabled_1 = require("../ensureApiEnabled");
const storage_1 = require("../gcp/storage");
const getProjectId = require("../getProjectId");
const extensionsApi_1 = require("./extensionsApi");
const localHelper_1 = require("./localHelper");
const prompt_1 = require("../prompt");
const logger = require("../logger");
const utils_2 = require("../utils");
var SpecParamType;
(function (SpecParamType) {
    SpecParamType["SELECT"] = "select";
    SpecParamType["MULTISELECT"] = "multiselect";
    SpecParamType["STRING"] = "string";
})(SpecParamType = exports.SpecParamType || (exports.SpecParamType = {}));
var SourceOrigin;
(function (SourceOrigin) {
    SourceOrigin["OFFICIAL_EXTENSION"] = "official extension";
    SourceOrigin["LOCAL"] = "unpublished extension (local source)";
    SourceOrigin["PUBLISHED_EXTENSION"] = "published extension";
    SourceOrigin["PUBLISHED_EXTENSION_VERSION"] = "specific version of a published extension";
    SourceOrigin["URL"] = "unpublished extension (URL source)";
    SourceOrigin["OFFICIAL_EXTENSION_VERSION"] = "specific version of an official extension";
})(SourceOrigin = exports.SourceOrigin || (exports.SourceOrigin = {}));
exports.logPrefix = "extensions";
exports.validLicenses = ["apache-2.0"];
exports.urlRegex = /^https:/;
exports.EXTENSIONS_BUCKET_NAME = utils_2.envOverride("FIREBASE_EXTENSIONS_UPLOAD_BUCKET", "firebase-ext-eap-uploads");
exports.AUTOPOULATED_PARAM_PLACEHOLDERS = {
    PROJECT_ID: "project-id",
    STORAGE_BUCKET: "project-id.appspot.com",
    EXT_INSTANCE_ID: "extension-id",
    DATABASE_INSTANCE: "project-id-default-rtdb",
    DATABASE_URL: "https://project-id-default-rtdb.firebaseio.com",
};
exports.resourceTypeToNiceName = {
    "firebaseextensions.v1beta.function": "Cloud Function",
};
function getDBInstanceFromURL(databaseUrl = "") {
    const instanceRegex = new RegExp("(?:https://)(.*)(?:.firebaseio.com)");
    const matches = databaseUrl.match(instanceRegex);
    if (matches && matches.length > 1) {
        return matches[1];
    }
    return "";
}
exports.getDBInstanceFromURL = getDBInstanceFromURL;
async function getFirebaseProjectParams(projectId) {
    const body = await functionsConfig_1.getFirebaseConfig({ project: projectId });
    const FIREBASE_CONFIG = JSON.stringify({
        projectId: body.projectId,
        databaseURL: body.databaseURL,
        storageBucket: body.storageBucket,
    });
    return {
        PROJECT_ID: body.projectId,
        DATABASE_URL: body.databaseURL,
        STORAGE_BUCKET: body.storageBucket,
        FIREBASE_CONFIG,
        DATABASE_INSTANCE: getDBInstanceFromURL(body.databaseURL),
    };
}
exports.getFirebaseProjectParams = getFirebaseProjectParams;
function substituteParams(original, params) {
    const startingString = JSON.stringify(original);
    const applySubstitution = (str, paramVal, paramKey) => {
        const exp1 = new RegExp("\\$\\{" + paramKey + "\\}", "g");
        const exp2 = new RegExp("\\$\\{param:" + paramKey + "\\}", "g");
        const regexes = [exp1, exp2];
        const substituteRegexMatches = (unsubstituted, regex) => {
            return unsubstituted.replace(regex, paramVal);
        };
        return _.reduce(regexes, substituteRegexMatches, str);
    };
    return JSON.parse(_.reduce(params, applySubstitution, startingString));
}
exports.substituteParams = substituteParams;
function populateDefaultParams(paramVars, paramSpec) {
    const newParams = paramVars;
    _.forEach(paramSpec, (env) => {
        if (!paramVars[env.param]) {
            if (env.default) {
                newParams[env.param] = env.default;
            }
            else {
                throw new error_1.FirebaseError(`${env.param} has not been set in the given params file` +
                    " and there is no default available. Please set this variable before installing again.");
            }
        }
    });
    return newParams;
}
exports.populateDefaultParams = populateDefaultParams;
function validateCommandLineParams(envVars, paramSpec) {
    if (_.size(envVars) > _.size(paramSpec)) {
        const paramList = _.map(paramSpec, (param) => {
            return param.param;
        });
        const misnamedParams = Object.keys(envVars).filter((key) => {
            return !paramList.includes(key);
        });
        logger.info("Warning: The following params were specified in your env file but do not exist in the extension spec: " +
            `${misnamedParams.join(", ")}.`);
    }
    let allParamsValid = true;
    _.forEach(paramSpec, (param) => {
        if (!askUserForParam_1.checkResponse(envVars[param.param], param)) {
            allParamsValid = false;
        }
    });
    if (!allParamsValid) {
        throw new error_1.FirebaseError(`Some param values are not valid. Please check your params file.`);
    }
}
exports.validateCommandLineParams = validateCommandLineParams;
function validateSpec(spec) {
    const errors = [];
    if (!spec.name) {
        errors.push("extension.yaml is missing required field: name");
    }
    if (!spec.specVersion) {
        errors.push("extension.yaml is missing required field: specVersion");
    }
    if (!spec.version) {
        errors.push("extension.yaml is missing required field: version");
    }
    if (!spec.license) {
        errors.push("extension.yaml is missing required field: license");
    }
    else {
        const formattedLicense = String(spec.license).toLocaleLowerCase();
        if (!exports.validLicenses.includes(formattedLicense)) {
            errors.push(`license field in extension.yaml is invalid. Valid value(s): ${exports.validLicenses.join(", ")}`);
        }
    }
    if (!spec.resources) {
        errors.push("Resources field must contain at least one resource");
    }
    else {
        for (const resource of spec.resources) {
            if (!resource.name) {
                errors.push("Resource is missing required field: name");
            }
            if (!resource.type) {
                errors.push(`Resource${resource.name ? ` ${resource.name}` : ""} is missing required field: type`);
            }
        }
    }
    for (const api of spec.apis || []) {
        if (!api.apiName) {
            errors.push("API is missing required field: apiName");
        }
    }
    for (const role of spec.roles || []) {
        if (!role.role) {
            errors.push("Role is missing required field: role");
        }
    }
    for (const param of spec.params || []) {
        if (!param.param) {
            errors.push("Param is missing required field: param");
        }
        if (!param.label) {
            errors.push(`Param${param.param ? ` ${param.param}` : ""} is missing required field: label`);
        }
        if (param.type && !_.includes(SpecParamType, param.type)) {
            errors.push(`Invalid type ${param.type} for param${param.param ? ` ${param.param}` : ""}. Valid types are ${_.values(SpecParamType).join(", ")}`);
        }
        if (!param.type || param.type == SpecParamType.STRING) {
            if (param.options) {
                errors.push(`Param${param.param ? ` ${param.param}` : ""} cannot have options because it is type STRING`);
            }
            if (param.default &&
                param.validationRegex &&
                !RegExp(param.validationRegex).test(param.default)) {
                errors.push(`Param${param.param ? ` ${param.param}` : ""} has default value '${param.default}', which does not pass the validationRegex ${param.validationRegex}`);
            }
        }
        if (param.type &&
            (param.type == SpecParamType.SELECT || param.type == SpecParamType.MULTISELECT)) {
            if (param.validationRegex) {
                errors.push(`Param${param.param ? ` ${param.param}` : ""} cannot have validationRegex because it is type ${param.type}`);
            }
            if (!param.options) {
                errors.push(`Param${param.param ? ` ${param.param}` : ""} requires options because it is type ${param.type}`);
            }
            for (const opt of param.options || []) {
                if (opt.value == undefined) {
                    errors.push(`Option for param${param.param ? ` ${param.param}` : ""} is missing required field: value`);
                }
            }
        }
    }
    if (errors.length) {
        const formatted = errors.map((error) => `  - ${error}`);
        const message = `The extension.yaml has the following errors: \n${formatted.join("\n")}`;
        throw new error_1.FirebaseError(message);
    }
}
exports.validateSpec = validateSpec;
async function promptForValidInstanceId(instanceId) {
    let instanceIdIsValid = false;
    let newInstanceId;
    const instanceIdRegex = /^[a-z][a-z\d\-]*[a-z\d]$/;
    while (!instanceIdIsValid) {
        newInstanceId = await prompt_1.promptOnce({
            type: "input",
            default: instanceId,
            message: `Please enter a new name for this instance:`,
        });
        if (newInstanceId.length <= 6 || 45 <= newInstanceId.length) {
            logger.info("Invalid instance ID. Instance ID must be between 6 and 45 characters.");
        }
        else if (!instanceIdRegex.test(newInstanceId)) {
            logger.info("Invalid instance ID. Instance ID must start with a lowercase letter, " +
                "end with a lowercase letter or number, and only contain lowercase letters, numbers, or -");
        }
        else {
            instanceIdIsValid = true;
        }
    }
    return newInstanceId;
}
exports.promptForValidInstanceId = promptForValidInstanceId;
async function ensureExtensionsApiEnabled(options) {
    const projectId = getProjectId(options);
    return await ensureApiEnabled_1.ensure(projectId, "firebaseextensions.googleapis.com", "extensions", options.markdown);
}
exports.ensureExtensionsApiEnabled = ensureExtensionsApiEnabled;
async function archiveAndUploadSource(extPath, bucketName) {
    const zippedSource = await archiveDirectory_1.archiveDirectory(extPath, {
        type: "zip",
        ignore: ["node_modules", ".git"],
    });
    return await storage_1.uploadObject(zippedSource, bucketName);
}
async function publishExtensionVersionFromLocalSource(publisherId, extensionId, rootDirectory) {
    const extensionSpec = await localHelper_1.getLocalExtensionSpec(rootDirectory);
    if (extensionSpec.name != extensionId) {
        throw new error_1.FirebaseError(`Extension ID '${clc.bold(extensionId)}' does not match the name in extension.yaml '${clc.bold(extensionSpec.name)}'.`);
    }
    const subbedSpec = JSON.parse(JSON.stringify(extensionSpec));
    subbedSpec.params = substituteParams(extensionSpec.params || [], exports.AUTOPOULATED_PARAM_PLACEHOLDERS);
    validateSpec(subbedSpec);
    const consent = await confirmExtensionVersion(publisherId, extensionId, extensionSpec.version);
    if (!consent) {
        return;
    }
    let extension;
    try {
        extension = await extensionsApi_1.getExtension(`${publisherId}/${extensionId}`);
    }
    catch (err) {
    }
    if (extension &&
        extension.latestVersion &&
        semver.lt(extensionSpec.version, extension.latestVersion)) {
        throw new error_1.FirebaseError(`The version you are trying to publish (${clc.bold(extensionSpec.version)}) is lower than the current version (${clc.bold(extension.latestVersion)}) for the extension '${clc.bold(`${publisherId}/${extensionId}`)}'. Please make sure this version is greater than the current version (${clc.bold(extension.latestVersion)}) inside of extension.yaml.\n`);
    }
    else if (extension &&
        extension.latestVersion &&
        semver.eq(extensionSpec.version, extension.latestVersion)) {
        throw new error_1.FirebaseError(`The version you are trying to publish (${clc.bold(extensionSpec.version)}) already exists for the extension '${clc.bold(`${publisherId}/${extensionId}`)}'. Please increment the version inside of extension.yaml.\n`);
    }
    const ref = `${publisherId}/${extensionId}@${extensionSpec.version}`;
    let packageUri;
    let objectPath = "";
    const uploadSpinner = ora.default(" Archiving and uploading extension source code");
    try {
        uploadSpinner.start();
        objectPath = await archiveAndUploadSource(rootDirectory, exports.EXTENSIONS_BUCKET_NAME);
        uploadSpinner.succeed(" Uploaded extension source code");
        packageUri = api_1.storageOrigin + objectPath + "?alt=media";
    }
    catch (err) {
        uploadSpinner.fail();
        throw err;
    }
    const publishSpinner = ora.default(`Publishing ${clc.bold(ref)}`);
    let res;
    try {
        publishSpinner.start();
        res = await extensionsApi_1.publishExtensionVersion(ref, packageUri);
        publishSpinner.succeed(` Successfully published ${clc.bold(ref)}`);
    }
    catch (err) {
        publishSpinner.fail();
        if (err.status == 404) {
            throw new error_1.FirebaseError(marked(`Couldn't find publisher ID '${clc.bold(publisherId)}'. Please ensure that you have registered this ID. To register as a publisher, you can check out the [Firebase documentation](https://firebase.google.com/docs/extensions/alpha/share#register_as_an_extensions_publisher) for step-by-step instructions.`));
        }
        throw err;
    }
    await deleteUploadedSource(objectPath);
    return res;
}
exports.publishExtensionVersionFromLocalSource = publishExtensionVersionFromLocalSource;
async function createSourceFromLocation(projectId, sourceUri) {
    let packageUri;
    let extensionRoot;
    let objectPath = "";
    if (!exports.urlRegex.test(sourceUri)) {
        const uploadSpinner = ora.default(" Archiving and uploading extension source code");
        try {
            uploadSpinner.start();
            objectPath = await archiveAndUploadSource(sourceUri, exports.EXTENSIONS_BUCKET_NAME);
            uploadSpinner.succeed(" Uploaded extension source code");
            packageUri = api_1.storageOrigin + objectPath + "?alt=media";
            extensionRoot = "/";
        }
        catch (err) {
            uploadSpinner.fail();
            throw err;
        }
    }
    else {
        [packageUri, extensionRoot] = sourceUri.split("#");
    }
    const res = await extensionsApi_1.createSource(projectId, packageUri, extensionRoot);
    logger.debug("Created new Extension Source %s", res.name);
    await deleteUploadedSource(objectPath);
    return res;
}
exports.createSourceFromLocation = createSourceFromLocation;
async function deleteUploadedSource(objectPath) {
    if (objectPath.length) {
        try {
            await storage_1.deleteObject(objectPath);
            logger.debug("Cleaned up uploaded source archive");
        }
        catch (err) {
            logger.debug("Unable to clean up uploaded source archive");
        }
    }
}
async function getExtensionSourceFromName(extensionName) {
    const officialExtensionRegex = /^[a-zA-Z\-]+[0-9@.]*$/;
    const existingSourceRegex = /projects\/.+\/sources\/.+/;
    if (officialExtensionRegex.test(extensionName)) {
        const [name, version] = extensionName.split("@");
        const registryEntry = await resolveSource_1.resolveRegistryEntry(name);
        const sourceUrl = resolveSource_1.resolveSourceUrl(registryEntry, name, version);
        return await extensionsApi_1.getSource(sourceUrl);
    }
    else if (existingSourceRegex.test(extensionName)) {
        logger.info(`Fetching the source "${extensionName}"...`);
        return await extensionsApi_1.getSource(extensionName);
    }
    throw new error_1.FirebaseError(`Could not find an extension named '${extensionName}'. `);
}
exports.getExtensionSourceFromName = getExtensionSourceFromName;
async function confirmExtensionVersion(publisherId, extensionId, versionId) {
    const message = `You are about to publish version ${clc.green(versionId)} of ${clc.green(`${publisherId}/${extensionId}`)} to Firebase's registry of extensions.\n\n` +
        "Once an extension version is published, it cannot be changed. If you wish to make changes after publishing, you will need to publish a new version. If you are a member of the Extensions EAP group, your published extensions will only be accessible to other members of the EAP group.\n\n" +
        "Do you wish to continue?";
    return await prompt_1.promptOnce({
        type: "confirm",
        message,
        default: false,
    });
}
exports.confirmExtensionVersion = confirmExtensionVersion;
async function promptForOfficialExtension(message) {
    const officialExts = await resolveSource_1.getExtensionRegistry(true);
    return await prompt_1.promptOnce({
        name: "input",
        type: "list",
        message,
        choices: utils_1.convertOfficialExtensionsToList(officialExts),
        pageSize: _.size(officialExts),
    });
}
exports.promptForOfficialExtension = promptForOfficialExtension;
async function promptForRepeatInstance(projectName, extensionName) {
    const message = `An extension with the ID '${clc.bold(extensionName)}' already exists in the project '${clc.bold(projectName)}'.\n` +
        `Do you want to proceed with installing another instance of extension '${clc.bold(extensionName)}' in this project?`;
    return await prompt_1.promptOnce({
        type: "confirm",
        message,
    });
}
exports.promptForRepeatInstance = promptForRepeatInstance;
async function instanceIdExists(projectId, instanceId) {
    const instanceRes = await extensionsApi_1.getInstance(projectId, instanceId, {
        resolveOnHTTPError: true,
    });
    if (instanceRes.error) {
        if (_.get(instanceRes, "error.code") === 404) {
            return false;
        }
        const msg = "Unexpected error when checking if instance ID exists: " +
            _.get(instanceRes, "error.message");
        throw new error_1.FirebaseError(msg, {
            original: instanceRes.error,
        });
    }
    return true;
}
exports.instanceIdExists = instanceIdExists;
async function getSourceOrigin(sourceOrVersion) {
    if (!sourceOrVersion) {
        return SourceOrigin.OFFICIAL_EXTENSION;
    }
    if (semver.valid(sourceOrVersion)) {
        return SourceOrigin.OFFICIAL_EXTENSION_VERSION;
    }
    if (fs.existsSync(sourceOrVersion)) {
        return SourceOrigin.LOCAL;
    }
    if (exports.urlRegex.test(sourceOrVersion)) {
        return SourceOrigin.URL;
    }
    try {
        await resolveSource_1.resolveRegistryEntry(sourceOrVersion);
        return SourceOrigin.OFFICIAL_EXTENSION;
    }
    catch (_a) {
    }
    if (sourceOrVersion.includes("/")) {
        let ref;
        try {
            ref = extensionsApi_1.parseRef(sourceOrVersion);
        }
        catch (err) {
        }
        if (ref && ref.publisherId && ref.extensionId && !ref.version) {
            return SourceOrigin.PUBLISHED_EXTENSION;
        }
        else if (ref && ref.publisherId && ref.extensionId && ref.version) {
            return SourceOrigin.PUBLISHED_EXTENSION_VERSION;
        }
    }
    throw new error_1.FirebaseError(`Could not find source '${clc.bold(sourceOrVersion)}'. Check to make sure the source is correct, and then please try again.`);
}
exports.getSourceOrigin = getSourceOrigin;
async function confirmInstallInstance() {
    const message = `Would you like to continue installing this extension?`;
    return await prompt_1.promptOnce({
        type: "confirm",
        message,
    });
}
exports.confirmInstallInstance = confirmInstallInstance;
