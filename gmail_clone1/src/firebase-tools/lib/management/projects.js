"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseProject = exports.listFirebaseProjects = exports.getAvailableCloudProjectPage = exports.getFirebaseProjectPage = exports.addFirebaseToCloudProject = exports.createCloudProject = exports.promptAvailableProjectId = exports.getOrPromptProject = exports.addFirebaseToCloudProjectAndLog = exports.createFirebaseProjectAndLog = exports.PROJECTS_CREATE_QUESTIONS = exports.ProjectParentResourceType = void 0;
const api = require("../api");
const clc = require("cli-color");
const ora = require("ora");
const _ = require("lodash");
const logger = require("../logger");
const error_1 = require("../error");
const operation_poller_1 = require("../operation-poller");
const prompt_1 = require("../prompt");
const utils = require("../utils");
const TIMEOUT_MILLIS = 30000;
const MAXIMUM_PROMPT_LIST = 100;
const PROJECT_LIST_PAGE_SIZE = 1000;
const CREATE_PROJECT_API_REQUEST_TIMEOUT_MILLIS = 15000;
var ProjectParentResourceType;
(function (ProjectParentResourceType) {
    ProjectParentResourceType["ORGANIZATION"] = "organization";
    ProjectParentResourceType["FOLDER"] = "folder";
})(ProjectParentResourceType = exports.ProjectParentResourceType || (exports.ProjectParentResourceType = {}));
exports.PROJECTS_CREATE_QUESTIONS = [
    {
        type: "input",
        name: "projectId",
        default: "",
        message: "Please specify a unique project id " +
            `(${clc.yellow("warning")}: cannot be modified afterward) [6-30 characters]:\n`,
    },
    {
        type: "input",
        name: "displayName",
        default: "",
        message: "What would you like to call your project? (defaults to your project ID)",
    },
];
async function createFirebaseProjectAndLog(projectId, options) {
    const spinner = ora("Creating Google Cloud Platform project").start();
    try {
        await createCloudProject(projectId, options);
        spinner.succeed();
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
    return addFirebaseToCloudProjectAndLog(projectId);
}
exports.createFirebaseProjectAndLog = createFirebaseProjectAndLog;
async function addFirebaseToCloudProjectAndLog(projectId) {
    let projectInfo;
    const spinner = ora("Adding Firebase resources to Google Cloud Platform project").start();
    try {
        projectInfo = await addFirebaseToCloudProject(projectId);
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
    spinner.succeed();
    logNewFirebaseProjectInfo(projectInfo);
    return projectInfo;
}
exports.addFirebaseToCloudProjectAndLog = addFirebaseToCloudProjectAndLog;
function logNewFirebaseProjectInfo(projectInfo) {
    logger.info("");
    if (process.platform === "win32") {
        logger.info("=== Your Firebase project is ready! ===");
    }
    else {
        logger.info("🎉🎉🎉 Your Firebase project is ready! 🎉🎉🎉");
    }
    logger.info("");
    logger.info("Project information:");
    logger.info(`   - Project ID: ${clc.bold(projectInfo.projectId)}`);
    logger.info(`   - Project Name: ${clc.bold(projectInfo.displayName)}`);
    logger.info("");
    logger.info("Firebase console is available at");
    logger.info(`https://console.firebase.google.com/project/${clc.bold(projectInfo.projectId)}/overview`);
}
async function getOrPromptProject(options) {
    if (options.project) {
        return await getFirebaseProject(options.project);
    }
    return selectProjectInteractively();
}
exports.getOrPromptProject = getOrPromptProject;
async function selectProjectInteractively(pageSize = MAXIMUM_PROMPT_LIST) {
    const { projects, nextPageToken } = await getFirebaseProjectPage(pageSize);
    if (projects.length === 0) {
        throw new error_1.FirebaseError("There are no Firebase projects associated with this account.");
    }
    if (nextPageToken) {
        return selectProjectByPrompting();
    }
    return selectProjectFromList(projects);
}
async function selectProjectByPrompting() {
    const projectId = await prompt_1.promptOnce({
        type: "input",
        message: "Please input the project ID you would like to use:",
    });
    return await getFirebaseProject(projectId);
}
async function selectProjectFromList(projects = []) {
    let choices = projects
        .filter((p) => !!p)
        .map((p) => {
        return {
            name: p.projectId + (p.displayName ? ` (${p.displayName})` : ""),
            value: p.projectId,
        };
    });
    choices = _.orderBy(choices, ["name"], ["asc"]);
    if (choices.length >= 25) {
        utils.logBullet(`Don't want to scroll through all your projects? If you know your project ID, ` +
            `you can initialize it directly using ${clc.bold("firebase init --project <project_id>")}.\n`);
    }
    const projectId = await prompt_1.promptOnce({
        type: "list",
        name: "id",
        message: "Select a default Firebase project for this directory:",
        choices,
    });
    const project = projects.find((p) => p.projectId === projectId);
    if (!project) {
        throw new error_1.FirebaseError("Unexpected error. Project does not exist");
    }
    return project;
}
function getProjectId(cloudProject) {
    const resourceName = cloudProject.project;
    return resourceName.substring(resourceName.lastIndexOf("/") + 1);
}
async function promptAvailableProjectId() {
    const { projects, nextPageToken } = await getAvailableCloudProjectPage(MAXIMUM_PROMPT_LIST);
    if (projects.length === 0) {
        throw new error_1.FirebaseError("There are no available Google Cloud projects to add Firebase services.");
    }
    if (nextPageToken) {
        return await prompt_1.promptOnce({
            type: "input",
            message: "Please input the ID of the Google Cloud Project you would like to add Firebase:",
        });
    }
    else {
        let choices = projects
            .filter((p) => !!p)
            .map((p) => {
            const projectId = getProjectId(p);
            return {
                name: projectId + (p.displayName ? ` (${p.displayName})` : ""),
                value: projectId,
            };
        });
        choices = _.orderBy(choices, ["name"], ["asc"]);
        return await prompt_1.promptOnce({
            type: "list",
            name: "id",
            message: "Select the Google Cloud Platform project you would like to add Firebase:",
            choices,
        });
    }
}
exports.promptAvailableProjectId = promptAvailableProjectId;
async function createCloudProject(projectId, options) {
    try {
        const response = await api.request("POST", "/v1/projects", {
            auth: true,
            origin: api.resourceManagerOrigin,
            timeout: CREATE_PROJECT_API_REQUEST_TIMEOUT_MILLIS,
            data: { projectId, name: options.displayName || projectId, parent: options.parentResource },
        });
        const projectInfo = await operation_poller_1.pollOperation({
            pollerName: "Project Creation Poller",
            apiOrigin: api.resourceManagerOrigin,
            apiVersion: "v1",
            operationResourceName: response.body.name,
        });
        return projectInfo;
    }
    catch (err) {
        if (err.status === 409) {
            throw new error_1.FirebaseError(`Failed to create project because there is already a project with ID ${clc.bold(projectId)}. Please try again with a unique project ID.`, {
                exit: 2,
                original: err,
            });
        }
        else {
            throw new error_1.FirebaseError("Failed to create project. See firebase-debug.log for more info.", {
                exit: 2,
                original: err,
            });
        }
    }
}
exports.createCloudProject = createCloudProject;
async function addFirebaseToCloudProject(projectId) {
    try {
        const response = await api.request("POST", `/v1beta1/projects/${projectId}:addFirebase`, {
            auth: true,
            origin: api.firebaseApiOrigin,
            timeout: CREATE_PROJECT_API_REQUEST_TIMEOUT_MILLIS,
        });
        const projectInfo = await operation_poller_1.pollOperation({
            pollerName: "Add Firebase Poller",
            apiOrigin: api.firebaseApiOrigin,
            apiVersion: "v1beta1",
            operationResourceName: response.body.name,
        });
        return projectInfo;
    }
    catch (err) {
        logger.debug(err.message);
        throw new error_1.FirebaseError("Failed to add Firebase to Google Cloud Platform project. See firebase-debug.log for more info.", { exit: 2, original: err });
    }
}
exports.addFirebaseToCloudProject = addFirebaseToCloudProject;
async function getProjectPage(apiResource, options) {
    const { responseKey, pageToken, pageSize } = options;
    const pageTokenQueryString = pageToken ? `&pageToken=${pageToken}` : "";
    const apiResponse = await api.request("GET", `${apiResource}?pageSize=${pageSize}${pageTokenQueryString}`, {
        auth: true,
        origin: api.firebaseApiOrigin,
        timeout: TIMEOUT_MILLIS,
    });
    return {
        projects: apiResponse.body[responseKey] || [],
        nextPageToken: apiResponse.body.nextPageToken,
    };
}
async function getFirebaseProjectPage(pageSize = PROJECT_LIST_PAGE_SIZE, pageToken) {
    let projectPage;
    try {
        projectPage = await getProjectPage("/v1beta1/projects", {
            responseKey: "results",
            pageSize,
            pageToken,
        });
    }
    catch (err) {
        logger.debug(err.message);
        throw new error_1.FirebaseError("Failed to list Firebase projects. See firebase-debug.log for more info.", { exit: 2, original: err });
    }
    return projectPage;
}
exports.getFirebaseProjectPage = getFirebaseProjectPage;
async function getAvailableCloudProjectPage(pageSize = PROJECT_LIST_PAGE_SIZE, pageToken) {
    try {
        return await getProjectPage("/v1beta1/availableProjects", {
            responseKey: "projectInfo",
            pageSize,
            pageToken,
        });
    }
    catch (err) {
        logger.debug(err.message);
        throw new error_1.FirebaseError("Failed to list available Google Cloud Platform projects. See firebase-debug.log for more info.", { exit: 2, original: err });
    }
}
exports.getAvailableCloudProjectPage = getAvailableCloudProjectPage;
async function listFirebaseProjects(pageSize) {
    const projects = [];
    let nextPageToken;
    do {
        const projectPage = await getFirebaseProjectPage(pageSize, nextPageToken);
        projects.push(...projectPage.projects);
        nextPageToken = projectPage.nextPageToken;
    } while (nextPageToken);
    return projects;
}
exports.listFirebaseProjects = listFirebaseProjects;
async function getFirebaseProject(projectId) {
    try {
        const response = await api.request("GET", `/v1beta1/projects/${projectId}`, {
            auth: true,
            origin: api.firebaseApiOrigin,
            timeout: TIMEOUT_MILLIS,
        });
        return response.body;
    }
    catch (err) {
        logger.debug(err.message);
        throw new error_1.FirebaseError(`Failed to get Firebase project ${projectId}. ` +
            "Please make sure the project exists and your account has permission to access it.", { exit: 2, original: err });
    }
}
exports.getFirebaseProject = getFirebaseProject;
