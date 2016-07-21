declare module "bwip-js" {
    function bwipjs(req: any, res: any, opts?: Object): void;

    namespace bwipjs {
        export function toBuffer(args: Object, cb: (err: string|Error, png: Buffer) => void): void;
        export function loadFont(fontname, sizemult, fontfile): void;
        export function unloadFont(fontname): void;

        export var bwipjs_version: string;
        export var bwipp_version: string;
    } 

    export = bwipjs;
}
