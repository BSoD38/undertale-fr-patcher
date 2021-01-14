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
let ohyesPath;
let backupPresent = false;

const patchButton = document.getElementById("patch");
const uninstallButton = document.getElementById("uninstall");
const statusText = document.getElementById("status");
const locationText = document.getElementById("location");

function installedMode() {
    patchButton.classList.remove("hidden");
    uninstallButton.classList.remove("hidden");
    patchButton.children[0].innerHTML = "<img id=\"imgPatch\" src=\"./Image/8bit-heart.png\"/>Réinstaller";
}

function uninstalledMode() {
    patchButton.classList.remove("hidden");
    uninstallButton.classList.add("hidden");
    patchButton.children[0].innerHTML = "<img id=\"imgPatch\" src=\"./Image/8bit-heart.png\"/>Installer";
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
        store.set("ohyesPath", ohyesPath);
    } else {
        statusText.textContent = "Le fichier de données est corrompu, vient d'une version non supportée, ou la sauvegarde des données originales a été perdue.";
        uninstallButton.classList.add("hidden");
    }
}

function getAppropriatePatch(checksumResult) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR ? process.env.PORTABLE_EXECUTABLE_DIR : __dirname, "..", "Patches", `${checksumResult.os}`, `${checksumResult.platform}.bps`);
}

document.addEventListener("DOMContentLoaded", () => {

    if (store.get('dataPath')) {
        dataPath = store.get('dataPath');
        ohyesPath = store.get('ohyesPath');
        checkDataPatch(dataPath);
    }

    document.getElementById("selectOrigFile").addEventListener("click", async () => {
      
        const selectedFolder = await dialog.showOpenDialog({
            title: "Sélectionnez le dossier d'installation d'Undertale",
            properties: ["openDirectory"]
        });
        if (!selectedFolder.filePaths[0]) {
            return;
        }
        patchButton.classList.add("hidden");

        // TODO: Add a loading indicator while the app is loading the file
        statusText.textContent = "Chargement en cours...";
        dataPath = undefined;
        ohyesPath = undefined;
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
            uninstallButton.classList.add("hidden");
            return;
        }
        ohyesPath = path.join(selectedFolder.filePaths[0], "mus_ohyes.ogg");
        try {
            await checkDataPatch(dataPath);
        } catch (e) {
            console.error(e);
        }

    });

    patchButton.addEventListener("click", async () => {
        if (dataBuffer instanceof Buffer && patchBuffer instanceof Buffer) {
            statusText.textContent = "Patch en cours...";
            uninstallButton.classList.add("hidden");

            const backupPath = `${dataPath}.bak`;
            const musBkpPath = `${ohyesPath}.bak`;
            if (backupPresent) {
                await fs.copyFile(backupPath, dataPath);
                await fs.copyFile(musBkpPath, ohyesPath);
            } else {
                await fs.copyFile(dataPath, backupPath);
                await fs.copyFile(ohyesPath, musBkpPath);
            }

            try {
                const resultBuffer = await Patcher.applyBps(dataBuffer, patchBuffer);
                await fs.writeFile(dataPath, resultBuffer);
                await fs.copyFile(path.join(process.env.PORTABLE_EXECUTABLE_DIR ? process.env.PORTABLE_EXECUTABLE_DIR : __dirname, "..", "Patches",  "mus_ohyes.ogg"), ohyesPath);
                statusText.textContent = "Installation terminée !";
                installedMode();
            } catch (e) {
                statusText.textContent = "Oh non ! Une erreur est survenue lors de l'installation du patch...";
                console.error(e);
            }
        }
    });

    uninstallButton.addEventListener("click", async () => {
        statusText.textContent = "Désinstallation en cours...";
        uninstallButton.classList.add("hidden");
        const backupPath = `${dataPath}.bak`;
        const musBkpPath = `${ohyesPath}.bak`;
        try {
            await fs.access(backupPath, fsConstants.F_OK);
            await fs.copyFile(backupPath, dataPath);
            await fs.unlink(backupPath);
            await fs.copyFile(musBkpPath, ohyesPath);
            await fs.unlink(musBkpPath);
            backupPresent = false;
            statusText.textContent = "Désinstallation terminée !";
            uninstalledMode();
        } catch (e) {
            console.error(e);
        }
    });

    document.querySelectorAll("button").forEach(el => {
        el.addEventListener("mouseenter", () => {
            new Audio("Sounds/snd_movemenu.wav").play();
        });
        switch (el.id) {
            case "uninstall":
                el.addEventListener("click", () => {
                    new Audio("Sounds/snd_hurt1.wav").play();
                });
                break;
            case "patch":
                el.addEventListener("click", () => {
                    new Audio("Sounds/snd_heal_c.wav").play();
                });
                break;
            default:
                el.addEventListener("click", () => {
                    new Audio("Sounds/snd_select.wav").play();
                });
        }
    });
});
