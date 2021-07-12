"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMiddleware = void 0;
const url = require("url");
const qs = require("querystring");
const apiv2_1 = require("../apiv2");
const logger = require("../logger");
const utils = require("../utils");
const SDK_PATH_REGEXP = /^\/__\/firebase\/([^/]+)\/([^/]+)$/;
function initMiddleware(init) {
    return (req, res, next) => {
        const parsedUrl = url.parse(req.url);
        const match = RegExp(SDK_PATH_REGEXP).exec(req.url);
        if (match) {
            const version = match[1];
            const sdkName = match[2];
            const u = new url.URL(`https://www.gstatic.com/firebasejs/${version}/${sdkName}`);
            const c = new apiv2_1.Client({ urlPrefix: u.origin, auth: false });
            c.request({
                method: "GET",
                path: u.pathname,
                responseType: "stream",
                resolveOnHTTPError: true,
            })
                .then((sdkRes) => {
                if (sdkRes.status === 404) {
                    return next();
                }
                sdkRes.body.pipe(res);
            })
                .catch((e) => {
                utils.logLabeledWarning("hosting", `Could not load Firebase SDK ${sdkName} v${version}, check your internet connection.`);
                logger.debug(e);
            });
        }
        else if (parsedUrl.pathname === "/__/firebase/init.js") {
            const query = qs.parse(parsedUrl.query || "");
            res.setHeader("Content-Type", "application/javascript");
            if (query["useEmulator"] === "true") {
                res.end(init.emulatorsJs);
            }
            else {
                res.end(init.js);
            }
        }
        else if (parsedUrl.pathname === "/__/firebase/init.json") {
            res.setHeader("Content-Type", "application/json");
            res.end(init.json);
        }
        else {
            next();
        }
    };
}
exports.initMiddleware = initMiddleware;
