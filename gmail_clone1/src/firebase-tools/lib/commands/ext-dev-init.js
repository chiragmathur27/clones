"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const marked = require("marked");
const TerminalRenderer = require("marked-terminal");
const checkMinRequiredVersion_1 = require("../checkMinRequiredVersion");
const command_1 = require("../command");
const Config = require("../config");
const error_1 = require("../error");
const prompt_1 = require("../prompt");
const logger = require("../logger");
const npmDependencies = require("../init/features/functions/npm-dependencies");
marked.setOptions({
    renderer: new TerminalRenderer(),
});
const TEMPLATE_ROOT = path.resolve(__dirname, "../../templates/extensions/");
const FUNCTIONS_ROOT = path.resolve(__dirname, "../../templates/init/functions/");
const EXT_SPEC_TEMPLATE = fs.readFileSync(path.join(TEMPLATE_ROOT, "extension.yaml"), "utf8");
const PREINSTALL_TEMPLATE = fs.readFileSync(path.join(TEMPLATE_ROOT, "PREINSTALL.md"), "utf8");
const POSTINSTALL_TEMPLATE = fs.readFileSync(path.join(TEMPLATE_ROOT, "POSTINSTALL.md"), "utf8");
async function typescriptSelected(config) {
    const packageLintingTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "typescript", "package.lint.json"), "utf8");
    const packageNoLintingTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "typescript", "package.nolint.json"), "utf8");
    const tsconfigTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "typescript", "tsconfig.json"), "utf8");
    const indexTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "typescript", "index.ts"), "utf8");
    const gitignoreTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "typescript", "_gitignore"), "utf8");
    const eslintTemplate = fs.readFileSync(path.join(FUNCTIONS_ROOT, "typescript", "_eslintrc"), "utf8");
    const lint = await prompt_1.promptOnce({
        name: "lint",
        type: "confirm",
        message: "Do you want to use ESLint to catch probable bugs and enforce style?",
        default: true,
    });
    await config.askWriteProjectFile("extension.yaml", EXT_SPEC_TEMPLATE);
    await config.askWriteProjectFile("PREINSTALL.md", PREINSTALL_TEMPLATE);
    await config.askWriteProjectFile("POSTINSTALL.md", POSTINSTALL_TEMPLATE);
    await config.askWriteProjectFile("functions/src/index.ts", indexTemplate);
    if (lint) {
        await config.askWriteProjectFile("functions/package.json", packageLintingTemplate);
        await config.askWriteProjectFile("functions/.eslintrc.js", eslintTemplate);
    }
    else {
        await config.askWriteProjectFile("functions/package.json", packageNoLintingTemplate);
    }
    await config.askWriteProjectFile("functions/tsconfig.json", tsconfigTemplate);
    await config.askWriteProjectFile("functions/.gitignore", gitignoreTemplate);
}
async function javascriptSelected(config) {
    const indexTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "javascript", "index.js"), "utf8");
    const packageLintingTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "javascript", "package.lint.json"), "utf8");
    const packageNoLintingTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "javascript", "package.nolint.json"), "utf8");
    const gitignoreTemplate = fs.readFileSync(path.join(TEMPLATE_ROOT, "javascript", "_gitignore"), "utf8");
    const eslintTemplate = fs.readFileSync(path.join(FUNCTIONS_ROOT, "javascript", "eslint.json"), "utf8");
    const lint = await prompt_1.promptOnce({
        name: "lint",
        type: "confirm",
        message: "Do you want to use ESLint to catch probable bugs and enforce style?",
        default: false,
    });
    await config.askWriteProjectFile("extension.yaml", EXT_SPEC_TEMPLATE);
    await config.askWriteProjectFile("PREINSTALL.md", PREINSTALL_TEMPLATE);
    await config.askWriteProjectFile("POSTINSTALL.md", POSTINSTALL_TEMPLATE);
    await config.askWriteProjectFile("functions/index.js", indexTemplate);
    if (lint) {
        await config.askWriteProjectFile("functions/package.json", packageLintingTemplate);
        await config.askWriteProjectFile("functions/.eslintrc.json", eslintTemplate);
    }
    else {
        await config.askWriteProjectFile("functions/package.json", packageNoLintingTemplate);
    }
    await config.askWriteProjectFile("functions/.gitignore", gitignoreTemplate);
}
exports.default = new command_1.Command("ext:dev:init")
    .description("initialize files for writing an extension in the current directory")
    .before(checkMinRequiredVersion_1.checkMinRequiredVersion, "extDevMinVersion")
    .action(async (options) => {
    const cwd = options.cwd || process.cwd();
    const config = new Config({}, { projectDir: cwd, cwd: cwd });
    try {
        const lang = await prompt_1.promptOnce({
            type: "list",
            name: "language",
            message: "In which language do you want to write the Cloud Functions for your extension?",
            default: "javascript",
            choices: [
                {
                    name: "JavaScript",
                    value: "javascript",
                },
                {
                    name: "TypeScript",
                    value: "typescript",
                },
            ],
        });
        switch (lang) {
            case "javascript": {
                await javascriptSelected(config);
                break;
            }
            case "typescript": {
                await typescriptSelected(config);
                break;
            }
            default: {
                throw new error_1.FirebaseError(`${lang} is not supported.`);
            }
        }
        await npmDependencies.askInstallDependencies({}, config);
        const welcome = fs.readFileSync(path.join(TEMPLATE_ROOT, lang, "WELCOME.md"), "utf8");
        return logger.info("\n" + marked(welcome));
    }
    catch (err) {
        if (!(err instanceof error_1.FirebaseError)) {
            throw new error_1.FirebaseError(`Error occurred when initializing files for new extension: ${err.message}`, {
                original: err,
            });
        }
        throw err;
    }
});
