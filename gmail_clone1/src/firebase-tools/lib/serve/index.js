"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = void 0;
const _ = require("lodash");
const logger = require("../logger");
const TARGETS = {
    hosting: require("./hosting"),
    functions: require("./functions"),
};
async function serve(options) {
    const targetNames = options.targets;
    options.port = parseInt(options.port, 10);
    await Promise.all(_.map(targetNames, (targetName) => {
        return TARGETS[targetName].start(options);
    }));
    await Promise.all(_.map(targetNames, (targetName) => {
        return TARGETS[targetName].connect();
    }));
    await new Promise((resolve) => {
        process.on("SIGINT", () => {
            logger.info("Shutting down...");
            return Promise.all(_.map(targetNames, (targetName) => {
                return TARGETS[targetName].stop(options);
            }))
                .then(resolve)
                .catch(resolve);
        });
    });
}
exports.serve = serve;
