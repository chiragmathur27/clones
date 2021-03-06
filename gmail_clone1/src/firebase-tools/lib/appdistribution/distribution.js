"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Distribution = exports.DistributionFileType = void 0;
const fs = require("fs-extra");
const error_1 = require("../error");
const crypto = require("crypto");
const logger = require("../logger");
var DistributionFileType;
(function (DistributionFileType) {
    DistributionFileType["IPA"] = "ipa";
    DistributionFileType["APK"] = "apk";
})(DistributionFileType = exports.DistributionFileType || (exports.DistributionFileType = {}));
class Distribution {
    constructor(path) {
        this.path = path;
        if (!path) {
            throw new error_1.FirebaseError("must specify a distribution file");
        }
        const distributionType = path.split(".").pop();
        if (distributionType !== DistributionFileType.IPA &&
            distributionType !== DistributionFileType.APK) {
            throw new error_1.FirebaseError("unsupported distribution file format, should be .ipa or .apk");
        }
        try {
            fs.ensureFileSync(path);
        }
        catch (err) {
            logger.info(err);
            throw new error_1.FirebaseError(`${path} is not a file. Verify that it points to a distribution binary.`);
        }
        this.path = path;
        this.fileType = distributionType;
    }
    readStream() {
        return fs.createReadStream(this.path);
    }
    platform() {
        switch (this.fileType) {
            case DistributionFileType.IPA:
                return "ios";
            case DistributionFileType.APK:
                return "android";
            default:
                throw new error_1.FirebaseError("Unsupported distribution file format, should be .ipa or .apk");
        }
    }
    binaryName(app) {
        return new Promise((resolve) => {
            const hash = crypto.createHash("sha256");
            const stream = this.readStream();
            stream.on("data", (data) => hash.update(data));
            stream.on("end", () => {
                return resolve(`projects/${app.projectNumber}/apps/${app.appId}/releases/-/binaries/${hash.digest("hex")}`);
            });
        });
    }
}
exports.Distribution = Distribution;
