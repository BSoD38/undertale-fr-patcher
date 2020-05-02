class Patcher {
    /**
     * @param rom
     * @param patch
     * @returns {Uint8Array}
     */
    static applyBps(rom, patch) {
        let i;

        function crc32(bytes) {
            let c;
            const crcTable = [];
            for (let n = 0; n < 256; n++) {
                c = n;
                for (let k = 0; k < 8; k++) {
                    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
                }
                crcTable[n] = c;
            }

            let crc = 0 ^ -1;
            for (let i = 0; i < bytes.length; i++) {
                crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
            }
            return (crc ^ -1) >>> 0;
        }

        let patchpos = 0;

        function u8() {
            return patch[patchpos++];
        }

        function u32at(pos) {
            return (
                ((patch[pos + 0] << 0) |
                    (patch[pos + 1] << 8) |
                    (patch[pos + 2] << 16) |
                    (patch[pos + 3] << 24)) >>>
                0
            );
        }

        function decode() {
            let ret = 0;
            let sh = 0;
            while (true) {
                const next = u8();
                ret += (next ^ 0x80) << sh;
                if (next & 0x80) {
                    return ret;
                }
                sh += 7;
            }
        }

        function decodes() {
            const enc = decode();
            let ret = enc >> 1;
            if (enc & 1) {
                ret = -ret;
            }
            return ret;
        }

        if (u8() !== 0x42 || u8() !== 0x50 || u8() !== 0x53 || u8() !== 0x31) {
            throw "not a BPS patch";
        }
        if (decode() !== rom.length) {
            throw "wrong input file";
        }
        if (crc32(rom) !== u32at(patch.length - 12)) {
            throw "wrong input file";
        }

        const out = new Uint8Array(decode());
        let outpos = 0;

        const metalen = decode();
        patchpos += metalen; // can't join these two, JS reads patchpos before calling decode

        const SourceRead = 0;
        const TargetRead = 1;
        const SourceCopy = 2;
        const TargetCopy = 3;

        let inreadpos = 0;
        let outreadpos = 0;

        while (patchpos < patch.length - 12) {
            const thisinstr = decode();
            const len = (thisinstr >> 2) + 1;
            const action = thisinstr & 3;

            switch (action) {
                case SourceRead:
                    {
                        for (i = 0; i < len; i++) {
                            out[outpos] = rom[outpos];
                            outpos++;
                        }
                    }
                    break;
                case TargetRead:
                    {
                        for (i = 0; i < len; i++) {
                            out[outpos++] = u8();
                        }
                    }
                    break;
                case SourceCopy:
                    {
                        inreadpos += decodes();
                        for (i = 0; i < len; i++)
                            out[outpos++] = rom[inreadpos++];
                    }
                    break;
                case TargetCopy:
                    {
                        outreadpos += decodes();
                        for (i = 0; i < len; i++)
                            out[outpos++] = out[outreadpos++];
                    }
                    break;
            }
        }

        return out;
    }

    /**
     * @param originalFile
     * @param bpsFile
     */
    static tryPatch(originalFile, bpsFile) {
        let romdata;
        let bpsdata;

        const romReader = new FileReader();
        romReader.onload = (e) => {
            romdata = {
                bytes: e.target.result,
                name: originalFile.name,
                mime: bpsFile.type
            };
        };
        romReader.readAsArrayBuffer(originalFile);

        const bpsReader = new FileReader();
        bpsReader.onload = (e) => {
            bpsdata = {
                bytes: e.target.result,
                name: bpsFile.name,
                mime: bpsFile.type
            };
        };
        bpsReader.readAsArrayBuffer(bpsFile);
    }
}

module.exports = { Patcher };
