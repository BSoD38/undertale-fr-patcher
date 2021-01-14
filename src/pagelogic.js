const { dialog } = require("electron").remote;
const path = require("path");
const fs = require("fs").promises;
const fsConstants = require("fs").constants;
const Patcher = require("./Utils/Patcher");
const Constants = require("./Utils/Constants");
const Store = require('electron-store');

const store = new Store();

let dataBuffer;
let patchBuffer;
let dataPath;
let backupPresent = false;

const patchButton = document.getElementById("patch");
const uninstallButton = document.getElementById("uninstall");
const statusText = document.getElementById("status");
const locationText = document.getElementById("location");

function installedMode() {
    patchButton.className = "";
    uninstallButton.className = "";
    patchButton.textContent = "Réinstaller";
}

function uninstalledMode() {
    patchButton.className = "";
    uninstallButton.className = "hidden";
    patchButton.textContent = "Installer";
}

async function checkDataPatch(dataFile) {
    await fs.access(dataFile, fsConstants.F_OK);

    const backupPath = `${dataFile}.bak`;
    try {
        await fs.access(backupPath, fsConstants.F_OK);
        backupPresent = true;
    } catch (e) {
        backupPresent = false;
    }

    let tmpDataBuffer;
    if (backupPresent) {
        tmpDataBuffer = await fs.readFile(backupPath);
    } else {
        tmpDataBuffer = await fs.readFile(dataFile);
    }
    const checksumResult = Constants.checksums[Patcher.crc32(tmpDataBuffer)];
    if (checksumResult) {
        dataBuffer = tmpDataBuffer;
        patchBuffer = await fs.readFile(getAppropriatePatch(checksumResult));
        locationText.textContent = dataFile.slice(0, -9);
        if (backupPresent) {
            installedMode();
        } else {
            uninstalledMode();
        }
        statusText.textContent = `Version détectée : ${Constants.fullNames[checksumResult.os]} - ${Constants.fullNames[checksumResult.platform]} - version ${checksumResult.version}`;
        store.set("dataPath", dataFile);
    } else {
        statusText.textContent = "Le fichier de données est corrompu, ou vient d'une version non supportée.";
    }
}

function getAppropriatePatch(checksumResult) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR ? process.env.PORTABLE_EXECUTABLE_DIR : __dirname, "..", "Patches", `${checksumResult.os}`, `${checksumResult.platform}.bps`);
}

document.addEventListener("DOMContentLoaded", () => {

    if (store.get('dataPath')) {
        dataPath = store.get('dataPath');
        checkDataPatch(dataPath);
    }

    document.getElementById("selectOrigFile").addEventListener("click", async () => {
      
        const selectedFolder = await dialog.showOpenDialog({
            title: "Sélectionnez le dossier d'installation d'Undertale",
            properties: ["openDirectory"]
        });
        document.getElementById("patch").className = "hidden";
        if (!selectedFolder.filePaths[0]) {
            return;
        }

        // TODO: Add a loading indicator while the app is loading the file
        document.getElementById("status").textContent = "Chargement en cours...";
        dataPath = undefined;
        let tempPath;
        try {
            tempPath = path.join(selectedFolder.filePaths[0], "data.win");
            await fs.access(tempPath, fsConstants.F_OK);
            dataPath = tempPath;
        } catch (e) {}
        try {
            tempPath = path.join(selectedFolder.filePaths[0], "game.ios");
            await fs.access(tempPath, fsConstants.F_OK);
            dataPath = tempPath;
        } catch (e) {}
        try {
            tempPath = path.join(selectedFolder.filePaths[0], "game.unx");
            await fs.access(tempPath, fsConstants.F_OK);
            dataPath = tempPath;
        } catch (e) {}
        if (!dataPath) {
            statusText.textContent = "Le dossier d'installation semble incorrect.";
        }
        try {
            await checkDataPatch(dataPath);
        } catch (e) {
            console.error(e);
        }

    });

    document.getElementById("patch").addEventListener("click", async () => {
        if (dataBuffer instanceof Buffer && patchBuffer instanceof Buffer) {
            document.getElementById("status").textContent = "Patch en cours...";

            const backupPath = `${dataPath}.bak`;
            if (backupPresent) {
                await fs.copyFile(backupPath, dataPath);
            } else {
                await fs.copyFile(dataPath, backupPath);
            }

            try {
                const resultBuffer = await Patcher.applyBps(dataBuffer, patchBuffer);
                await fs.writeFile(dataPath, resultBuffer);
                statusText.textContent = "Installation terminée !";
                installedMode();
            } catch (e) {
                statusText.textContent = "Oh non ! Une erreur est survenue lors de l'installation du patch...";
                console.error(e);
            }
        }
    });

    document.getElementById("uninstall").addEventListener("click", async () => {
        statusText.textContent = "Désinstallation en cours...";
        const backupPath = `${dataPath}.bak`;
        try {
            await fs.access(backupPath, fsConstants.F_OK);
            await fs.copyFile(backupPath, dataPath);
            await fs.unlink(backupPath);
            backupPresent = false;
            statusText.textContent = "Désinstallation terminée !";
            uninstalledMode();
        } catch (e) {
            console.error(e);
        }
    });
});
