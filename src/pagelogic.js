const { dialog } = require("electron").remote;
const fs = require("fs").promises;

let selectedOriginalData;
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("select-orig-file").addEventListener("click", async () => {
        selectedOriginalData = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                {name: "Données d'Undertale", extensions: ["win", "unx", "ios"]}
            ]
        });
        if (selectedOriginalData.filePaths[0]) {
            console.log(await fs.readFile(selectedOriginalData.filePaths[0]));
        }
    });
})
