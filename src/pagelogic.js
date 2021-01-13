const { dialog } = require("electron").remote;
const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const fsConstants = require("fs").constants;
const Patcher = require("./Utils/Patcher");
const Constants = require("./Utils/Constants");

let dataBuffer;
let patchBuffer;
let dataPath;

function getAppropriatePatch(checksumResult) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR ? process.env.PORTABLE_EXECUTABLE_DIR : __dirname, "..", "Patches", `${checksumResult.os}`, `${checksumResult.platform}.bps`);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("selectOrigFile").addEventListener("click", async () => {
        const selectedFolder = await dialog.showOpenDialog({
            title: "Sélectionnez le dossier d'installation d'Undertale",
            properties: ["openDirectory"]
        });

        // TODO: Add a loading indicator while the app is loading the file
        document.getElementById("status").textContent = "Chargement en cours...";
        dataPath = path.join(selectedFolder.filePaths[0], `data.${Constants.fileExtensions[os.platform()]}`);
        try {
            await fs.access(dataPath, fsConstants.F_OK);
        } catch (e) {
            alert("Ce dossier ne contient pas Undertale, ou n'est pas pour le bon système d'exploitation.");
        }

        const tmpDataBuffer = await fs.readFile(dataPath);
        const checksumResult = Constants.checksums[Patcher.crc32(tmpDataBuffer)];
        if (checksumResult) {
            dataBuffer = tmpDataBuffer;
            patchBuffer = await fs.readFile(getAppropriatePatch(checksumResult))
            document.getElementById("status").textContent = `Version détectée : ${checksumResult.os} - ${checksumResult.platform} ${checksumResult.version}`;
        } else {
            alert("Le fichier de données est corrompu, ou vient d'une version non supportée.");
        }
    });

    document.getElementById("patch").addEventListener("click", async () => {
        if (dataBuffer instanceof Buffer && patchBuffer instanceof Buffer) {
            document.getElementById("status").textContent = "Patch en cours...";

            const backupFilename = `${dataPath}.bak`;
            try {
                await fs.access(backupFilename, fsConstants.F_OK);
                if (confirm("Jeu déjà patché. Réinstaller le patch ?")) {
                    await fs.copyFile(backupFilename, dataPath);
                } else {
                    return;
                }
            } catch (e) {
                await fs.copyFile(dataPath, backupFilename);
            }

            try {
                const resultBuffer = await Patcher.applyBps(dataBuffer, patchBuffer);
                await fs.writeFile(dataPath, resultBuffer);
                // TODO: Better finish indicator
                alert("Terminé !");
            } catch (e) {
                console.error(e);
            }
        }
    });
});
