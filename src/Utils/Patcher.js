// Created by Alcaro, and edited by the UTFR Team.
const crc32 = require("Checksum");

module.exports = class Patcher {
    /**
     * @param Buffer data
     * @param Buffer patch
     * @returns {Buffer}
     */
    static applyBps({buf: data}, {buf: patch}) {
        let i;
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
        if (decode() !== data.length) {
            throw "wrong input file";
        }
        if (crc32(data) !== u32at(patch.length - 12)) {
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
                            out[outpos] = data[outpos];
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
                        for (i = 0; i < len; i++) {
                            out[outpos++] = data[inreadpos++];
                        }
                    }
                    break;
                case TargetCopy:
                    {
                        outreadpos += decodes();
                        for (i = 0; i < len; i++) {
                            out[outpos++] = out[outreadpos++];
                        }
                    }
                    break;
            }
        }

        return new Buffer(out);
    }
}
