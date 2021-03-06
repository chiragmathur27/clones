"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorRequestHandler = exports.proxyRequestHandler = void 0;
const lodash_1 = require("lodash");
const stream_1 = require("stream");
const url_1 = require("url");
const abort_controller_1 = require("abort-controller");
const apiv2_1 = require("../apiv2");
const error_1 = require("../error");
const logger = require("../logger");
const node_fetch_1 = require("node-fetch");
const REQUIRED_VARY_VALUES = ["Accept-Encoding", "Authorization", "Cookie"];
function makeVary(vary = "") {
    if (!vary) {
        return "Accept-Encoding, Authorization, Cookie";
    }
    const varies = vary.split(/, ?/).map((v) => {
        return v
            .split("-")
            .map((part) => lodash_1.capitalize(part))
            .join("-");
    });
    REQUIRED_VARY_VALUES.forEach((requiredVary) => {
        if (!lodash_1.includes(varies, requiredVary)) {
            varies.push(requiredVary);
        }
    });
    return varies.join(", ");
}
function proxyRequestHandler(url, rewriteIdentifier) {
    return async (req, res, next) => {
        var _a;
        logger.info(`[hosting] Rewriting ${req.url} to ${url} for ${rewriteIdentifier}`);
        const cookie = req.headers.cookie || "";
        const sessionCookie = cookie.split(/; ?/).find((c) => {
            return c.trim().startsWith("__session=");
        });
        const u = new url_1.URL(url + req.url);
        const c = new apiv2_1.Client({ urlPrefix: u.origin, auth: false });
        const controller = new abort_controller_1.default();
        const timer = setTimeout(() => controller.abort(), 60000);
        let passThrough;
        if (req.method && !["GET", "HEAD"].includes(req.method)) {
            passThrough = new stream_1.PassThrough();
            req.pipe(passThrough);
        }
        const headers = new node_fetch_1.Headers({
            "X-Forwarded-Host": req.headers.host || "",
            "X-Original-Url": req.url || "",
            Pragma: "no-cache",
            "Cache-Control": "no-cache, no-store",
            Cookie: sessionCookie || "",
        });
        for (const key of Object.keys(req.headers)) {
            const value = req.headers[key];
            if (value == undefined) {
                headers.delete(key);
            }
            else if (Array.isArray(value)) {
                headers.delete(key);
                for (const v of value) {
                    headers.append(key, v);
                }
            }
            else {
                headers.set(key, value);
            }
        }
        let proxyRes;
        try {
            proxyRes = await c.request({
                method: (req.method || "GET"),
                path: u.pathname,
                queryParams: u.searchParams,
                headers,
                resolveOnHTTPError: true,
                responseType: "stream",
                redirect: "manual",
                body: passThrough,
                signal: controller.signal,
            });
        }
        catch (err) {
            clearTimeout(timer);
            const isAbortError = err instanceof error_1.FirebaseError && ((_a = err.original) === null || _a === void 0 ? void 0 : _a.name.includes("AbortError"));
            const isTimeoutError = err instanceof error_1.FirebaseError &&
                err.original instanceof node_fetch_1.FetchError &&
                err.original.code === "ETIMEDOUT";
            const isSocketTimeoutError = err instanceof error_1.FirebaseError &&
                err.original instanceof node_fetch_1.FetchError &&
                err.original.code === "ESOCKETTIMEDOUT";
            if (isAbortError || isTimeoutError || isSocketTimeoutError) {
                res.statusCode = 504;
                return res.end("Timed out waiting for function to respond.\n");
            }
            res.statusCode = 500;
            return res.end(`An internal error occurred while proxying for ${rewriteIdentifier}\n`);
        }
        clearTimeout(timer);
        if (proxyRes.status === 404) {
            const cascade = proxyRes.response.headers.get("x-cascade");
            if (cascade && cascade.toUpperCase() === "PASS") {
                return next();
            }
        }
        if (!proxyRes.response.headers.get("cache-control")) {
            proxyRes.response.headers.set("cache-control", "private");
        }
        const cc = proxyRes.response.headers.get("cache-control");
        if (cc && !cc.includes("private")) {
            proxyRes.response.headers.delete("set-cookie");
        }
        proxyRes.response.headers.set("vary", makeVary(proxyRes.response.headers.get("vary")));
        for (const [key, value] of Object.entries(proxyRes.response.headers.raw())) {
            res.setHeader(key, value);
        }
        res.statusCode = proxyRes.status;
        proxyRes.response.body.pipe(res);
    };
}
exports.proxyRequestHandler = proxyRequestHandler;
function errorRequestHandler(error) {
    return (req, res, next) => {
        res.statusCode = 500;
        const out = `A problem occurred while trying to handle a proxied rewrite: ${error}`;
        logger.error(out);
        res.end(out);
    };
}
exports.errorRequestHandler = errorRequestHandler;
