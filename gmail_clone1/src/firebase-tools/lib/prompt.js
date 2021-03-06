"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptOnce = exports.prompt = void 0;
const inquirer = require("inquirer");
const _ = require("lodash");
const error_1 = require("./error");
async function prompt(options, questions) {
    const prompts = [];
    for (const question of questions) {
        if (question.name && options[question.name] === undefined) {
            prompts.push(question);
        }
    }
    if (prompts.length && options.nonInteractive) {
        const missingOptions = _.uniq(_.map(prompts, "name")).join(", ");
        throw new error_1.FirebaseError(`Missing required options (${missingOptions}) while running in non-interactive mode`, {
            children: prompts,
            exit: 1,
        });
    }
    const answers = await inquirer.prompt(prompts);
    _.forEach(answers, (v, k) => {
        options[k] = v;
    });
    return answers;
}
exports.prompt = prompt;
async function promptOnce(question) {
    question.name = question.name || "question";
    const answers = await prompt({}, [question]);
    return answers[question.name];
}
exports.promptOnce = promptOnce;
