/* eslint-disable no-var */
import { PocketIcServer } from "@hadronous/pic";
import { Buffer as ImportedBuffer } from "buffer";

declare global {
    declare var __PIC__: PocketIcServer;
    var Buffer: typeof import("buffer").Buffer;

    namespace NodeJS {
        interface ProcessEnv {
            PIC_URL: string;
        }
    }
}

globalThis.Buffer = globalThis.Buffer || ImportedBuffer;
