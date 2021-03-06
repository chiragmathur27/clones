"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const clc = require("cli-color");
const command_1 = require("../command");
const logger = require("../logger");
const configstore_1 = require("../configstore");
const utils = require("../utils");
const error_1 = require("../error");
const prompt_1 = require("../prompt");
const auth = require("../auth");
const utils_1 = require("../utils");
module.exports = new command_1.Command("login")
    .description("log the CLI into Firebase")
    .option("--no-localhost", "copy and paste a code instead of starting a local server for authentication")
    .option("--reauth", "force reauthentication even if already logged in")
    .action(async (options) => {
    if (options.nonInteractive) {
        throw new error_1.FirebaseError("Cannot run login in non-interactive mode. See " +
            clc.bold("login:ci") +
            " to generate a token for use in non-interactive environments.", { exit: 1 });
    }
    const user = configstore_1.configstore.get("user");
    const tokens = configstore_1.configstore.get("tokens");
    if (user && tokens && !options.reauth) {
        logger.info("Already logged in as", clc.bold(user.email));
        return user;
    }
    if (!options.reauth) {
        utils.logBullet("Firebase optionally collects CLI usage and error reporting information to help improve our products. Data is collected in accordance with Google's privacy policy (https://policies.google.com/privacy) and is not used to identify you.\n");
        await prompt_1.prompt(options, [
            {
                type: "confirm",
                name: "collectUsage",
                message: "Allow Firebase to collect CLI usage and error reporting information?",
            },
        ]);
        configstore_1.configstore.set("usage", options.collectUsage);
        if (options.collectUsage) {
            utils.logBullet("To change your data collection preference at any time, run `firebase logout` and log in again.");
        }
    }
    const useLocalhost = utils_1.isCloudEnvironment() ? false : options.localhost;
    const result = await auth.login(useLocalhost, _.get(user, "email"));
    configstore_1.configstore.set("user", result.user);
    configstore_1.configstore.set("tokens", result.tokens);
    configstore_1.configstore.set("loginScopes", result.scopes);
    configstore_1.configstore.delete("session");
    logger.info();
    utils.logSuccess("Success! Logged in as " + clc.bold(result.user.email));
    return auth;
});
