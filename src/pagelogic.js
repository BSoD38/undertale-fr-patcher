const { dialog } = require("electron").remote;
const fs = require("fs").promises;
const fsConstants = require("fs").constants;
const Patcher = require("./Utils/Patcher");

let selectedOriginalData;
let dataBuffer;
let patchBuffer;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("select-orig-file").addEventListener("click", async () => {
        const selectedOriginalData = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                {name: "Données d'Undertale", extensions: ["win", "unx", "ios"]}
            ]
        });

        if (selectedOriginalData.filePaths[0]) {
            dataBuffer = await fs.readFile(selectedOriginalData.filePaths[0]);
        }
    });

    document.getElementById("select-patch").addEventListener("click", async () => {
        selectedOriginalData = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                {name: "Fichier de patch", extensions: ["bps"]}
            ]
        });

        if (selectedOriginalData.filePaths[0]) {
            patchBuffer = await fs.readFile(selectedOriginalData.filePaths[0]);
        }
    });

    document.getElementById("patch").addEventListener("click", async () => {
        if (dataBuffer instanceof Buffer && patchBuffer instanceof Buffer) {
            const backupFilename = `${selectedOriginalData.filePaths[0]}.bak`;
            try {
                await fs.access(backupFilename, fsConstants.F_OK);
            } catch (e) {
                await fs.copyFile(selectedOriginalData.filePaths[0], `${selectedOriginalData.filePaths[0]}.bak`);
            }
            try {
                const resultBuffer = await Patcher.applyBps(dataBuffer, patchBuffer);
                await fs.writeFile(selectedOriginalData.filePaths[0], resultBuffer);
            } catch (e) {
                console.error(e);
            }
        }
    });
});
