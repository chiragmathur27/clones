"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../command");
const controller = require("../emulator/controller");
const commandUtils = require("../emulator/commandUtils");
const logger = require("../logger");
const registry_1 = require("../emulator/registry");
const types_1 = require("../emulator/types");
const clc = require("cli-color");
const constants_1 = require("../emulator/constants");
const Table = require("cli-table");
function stylizeLink(url) {
    return clc.underline(clc.bold(url));
}
module.exports = new command_1.Command("emulators:start")
    .before(commandUtils.setExportOnExitOptions)
    .before(commandUtils.beforeEmulatorCommand)
    .description("start the local Firebase emulators")
    .option(commandUtils.FLAG_ONLY, commandUtils.DESC_ONLY)
    .option(commandUtils.FLAG_INSPECT_FUNCTIONS, commandUtils.DESC_INSPECT_FUNCTIONS)
    .option(commandUtils.FLAG_IMPORT, commandUtils.DESC_IMPORT)
    .option(commandUtils.FLAG_EXPORT_ON_EXIT, commandUtils.DESC_EXPORT_ON_EXIT)
    .action(async (options) => {
    const killSignalPromise = commandUtils.shutdownWhenKilled(options);
    try {
        await controller.startAll(options);
    }
    catch (e) {
        await controller.cleanShutdown();
        throw e;
    }
    const reservedPorts = [];
    for (const internalEmulator of [types_1.Emulators.LOGGING]) {
        const info = registry_1.EmulatorRegistry.getInfo(internalEmulator);
        if (info) {
            reservedPorts.push(info.port);
        }
    }
    const uiInfo = registry_1.EmulatorRegistry.getInfo(types_1.Emulators.UI);
    const hubInfo = registry_1.EmulatorRegistry.getInfo(types_1.Emulators.HUB);
    const uiUrl = uiInfo ? `http://${registry_1.EmulatorRegistry.getInfoHostString(uiInfo)}` : "unknown";
    const head = ["Emulator", "Host:Port"];
    if (uiInfo) {
        head.push(`View in ${constants_1.Constants.description(types_1.Emulators.UI)}`);
    }
    const successMessageTable = new Table();
    let successMsg = `${clc.green("✔")}  ${clc.bold("All emulators ready! It is now safe to connect your app.")}`;
    if (uiInfo) {
        successMsg += `\n${clc.cyan("i")}  View Emulator UI at ${stylizeLink(uiUrl)}`;
    }
    successMessageTable.push([successMsg]);
    const emulatorsTable = new Table({
        head: head,
        style: {
            head: ["yellow"],
        },
    });
    emulatorsTable.push(...controller
        .filterEmulatorTargets(options)
        .map((emulator) => {
        const info = registry_1.EmulatorRegistry.getInfo(emulator);
        const emulatorName = constants_1.Constants.description(emulator).replace(/ emulator/i, "");
        const isSupportedByUi = types_1.EMULATORS_SUPPORTED_BY_UI.includes(emulator);
        if (!info) {
            return [emulatorName, "Failed to initialize (see above)", "", ""];
        }
        return [
            emulatorName,
            registry_1.EmulatorRegistry.getInfoHostString(info),
            isSupportedByUi && uiInfo
                ? stylizeLink(`${uiUrl}/${emulator}`)
                : clc.blackBright("n/a"),
        ];
    })
        .map((col) => col.slice(0, head.length))
        .filter((v) => v));
    logger.info(`\n${successMessageTable}

${emulatorsTable}
${hubInfo
        ? clc.blackBright("  Emulator Hub running at ") + registry_1.EmulatorRegistry.getInfoHostString(hubInfo)
        : clc.blackBright("  Emulator Hub not running.")}
${clc.blackBright("  Other reserved ports:")} ${reservedPorts.join(", ")}

Issues? Report them at ${stylizeLink("https://github.com/firebase/firebase-tools/issues")} and attach the *-debug.log files.
 `);
    await killSignalPromise;
});
