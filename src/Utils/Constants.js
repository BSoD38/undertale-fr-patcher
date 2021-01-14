module.exports = {
    // Gives game version for each data file CRC32 checksum
    checksums: {
        3553786966: {
            os: "win",
            platform: "steam",
            version: "1.08"
        },
        2028031612: {
            os: "win",
            platform: "gog",
            version: "1.08"
        },
        606560200: {
            os: "ios",
            platform: "steam",
            version: "1.08"
        },
        235211443: {
            os: "unx",
            platform: "steam",
            version: "1.08"
        }
    },
    fullNames: {
        win: "Windows",
        ios: "Mac OS",
        unx: "Linux",
        steam: "Steam",
        gog: "GOG"
    },
    // Get data file extension by OS
    fileExtensions: {
        win32: "win",
        linux: "unx",
        darwin: "ios"
    }
};