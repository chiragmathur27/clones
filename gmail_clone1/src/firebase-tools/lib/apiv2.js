"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = exports.setAccessToken = exports.setRefreshToken = void 0;
const node_fetch_1 = require("node-fetch");
const stream_1 = require("stream");
const url_1 = require("url");
const error_1 = require("./error");
const logger = require("./logger");
const responseToError = require("./responseToError");
const CLI_VERSION = require("../package.json").version;
let accessToken = "";
let refreshToken = "";
function setRefreshToken(token = "") {
    refreshToken = token;
}
exports.setRefreshToken = setRefreshToken;
function setAccessToken(token = "") {
    accessToken = token;
}
exports.setAccessToken = setAccessToken;
class Client {
    constructor(opts) {
        this.opts = opts;
        if (this.opts.auth === undefined) {
            this.opts.auth = true;
        }
        if (this.opts.urlPrefix.endsWith("/")) {
            this.opts.urlPrefix = this.opts.urlPrefix.substring(0, this.opts.urlPrefix.length - 1);
        }
    }
    get(path, options = {}) {
        const reqOptions = Object.assign(options, {
            method: "GET",
            path,
        });
        return this.request(reqOptions);
    }
    post(path, json, options = {}) {
        const reqOptions = Object.assign(options, {
            method: "POST",
            path,
            body: json,
        });
        return this.request(reqOptions);
    }
    patch(path, json, options = {}) {
        const reqOptions = Object.assign(options, {
            method: "PATCH",
            path,
            body: json,
        });
        return this.request(reqOptions);
    }
    put(path, json, options = {}) {
        const reqOptions = Object.assign(options, {
            method: "PUT",
            path,
            body: json,
        });
        return this.request(reqOptions);
    }
    delete(path, options = {}) {
        const reqOptions = Object.assign(options, {
            method: "DELETE",
            path,
        });
        return this.request(reqOptions);
    }
    async request(reqOptions) {
        if (!reqOptions.responseType) {
            reqOptions.responseType = "json";
        }
        if (reqOptions.responseType === "stream" && !reqOptions.resolveOnHTTPError) {
            throw new error_1.FirebaseError("apiv2 will not handle HTTP errors while streaming and you must set `resolveOnHTTPError` and check for res.status >= 400 on your own", { exit: 2 });
        }
        let internalReqOptions = Object.assign(reqOptions, {
            headers: new node_fetch_1.Headers(reqOptions.headers),
        });
        internalReqOptions = this.addRequestHeaders(internalReqOptions);
        if (this.opts.auth) {
            internalReqOptions = await this.addAuthHeader(internalReqOptions);
        }
        try {
            return await this.doRequest(internalReqOptions);
        }
        catch (err) {
            if (err instanceof error_1.FirebaseError) {
                throw err;
            }
            throw new error_1.FirebaseError(`Failed to make request: ${err}`, { original: err });
        }
    }
    addRequestHeaders(reqOptions) {
        if (!reqOptions.headers) {
            reqOptions.headers = new node_fetch_1.Headers();
        }
        reqOptions.headers.set("Connection", "keep-alive");
        reqOptions.headers.set("User-Agent", `FirebaseCLI/${CLI_VERSION}`);
        reqOptions.headers.set("X-Client-Version", `FirebaseCLI/${CLI_VERSION}`);
        if (reqOptions.responseType === "json") {
            reqOptions.headers.set("Content-Type", "application/json");
        }
        return reqOptions;
    }
    async addAuthHeader(reqOptions) {
        if (!reqOptions.headers) {
            reqOptions.headers = new node_fetch_1.Headers();
        }
        const token = await this.getAccessToken();
        reqOptions.headers.set("Authorization", `Bearer ${token}`);
        return reqOptions;
    }
    async getAccessToken() {
        if (accessToken) {
            return accessToken;
        }
        const data = await require("./auth").getAccessToken(refreshToken, []);
        return data.access_token;
    }
    requestURL(options) {
        const versionPath = this.opts.apiVersion ? `/${this.opts.apiVersion}` : "";
        return `${this.opts.urlPrefix}${versionPath}${options.path}`;
    }
    async doRequest(options) {
        if (!options.path.startsWith("/")) {
            options.path = "/" + options.path;
        }
        let fetchURL = this.requestURL(options);
        if (options.queryParams) {
            if (!(options.queryParams instanceof url_1.URLSearchParams)) {
                const sp = new url_1.URLSearchParams();
                for (const key of Object.keys(options.queryParams)) {
                    const value = options.queryParams[key];
                    sp.append(key, `${value}`);
                }
                options.queryParams = sp;
            }
            const queryString = options.queryParams.toString();
            if (queryString) {
                fetchURL += `?${queryString}`;
            }
        }
        const fetchOptions = {
            headers: options.headers,
            method: options.method,
            redirect: options.redirect,
            signal: options.signal,
        };
        if (typeof options.body === "string" || isStream(options.body)) {
            fetchOptions.body = options.body;
        }
        else if (options.body !== undefined) {
            fetchOptions.body = JSON.stringify(options.body);
        }
        this.logRequest(options);
        let res;
        try {
            res = await node_fetch_1.default(fetchURL, fetchOptions);
        }
        catch (err) {
            throw new error_1.FirebaseError(`Failed to make request to ${fetchURL}`, { original: err });
        }
        let body;
        if (options.responseType === "json") {
            if (res.status === 204) {
                body = undefined;
            }
            else {
                body = await res.json();
            }
        }
        else if (options.responseType === "stream") {
            body = res.body;
        }
        else {
            throw new error_1.FirebaseError(`Unable to interpret response. Please set responseType.`, {
                exit: 2,
            });
        }
        this.logResponse(res, body, options);
        if (res.status >= 400) {
            if (!options.resolveOnHTTPError) {
                throw responseToError({ statusCode: res.status }, body);
            }
        }
        return {
            status: res.status,
            response: res,
            body,
        };
    }
    logRequest(options) {
        var _a, _b;
        let queryParamsLog = "[none]";
        if (options.queryParams) {
            queryParamsLog = "[omitted]";
            if (!((_a = options.skipLog) === null || _a === void 0 ? void 0 : _a.queryParams)) {
                queryParamsLog =
                    options.queryParams instanceof url_1.URLSearchParams
                        ? options.queryParams.toString()
                        : JSON.stringify(options.queryParams);
            }
        }
        const logURL = this.requestURL(options);
        logger.debug(`>>> [apiv2][query] ${options.method} ${logURL} ${queryParamsLog}`);
        if (options.body !== undefined) {
            let logBody = "[omitted]";
            if (!((_b = options.skipLog) === null || _b === void 0 ? void 0 : _b.body)) {
                logBody = bodyToString(options.body);
            }
            logger.debug(`>>> [apiv2][body] ${options.method} ${logURL} ${logBody}`);
        }
    }
    logResponse(res, body, options) {
        var _a;
        const logURL = this.requestURL(options);
        logger.debug(`<<< [apiv2][status] ${options.method} ${logURL} ${res.status}`);
        let logBody = "[omitted]";
        if (!((_a = options.skipLog) === null || _a === void 0 ? void 0 : _a.resBody)) {
            logBody = bodyToString(body);
        }
        logger.debug(`<<< [apiv2][body] ${options.method} ${logURL} ${logBody}`);
    }
}
exports.Client = Client;
function bodyToString(body) {
    if (isStream(body)) {
        return "[stream]";
    }
    else {
        try {
            return JSON.stringify(body);
        }
        catch (_) {
            return `${body}`;
        }
    }
}
function isStream(o) {
    return o instanceof stream_1.Readable;
}
