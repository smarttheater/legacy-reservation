declare module "soap-cookie" {
    interface SoapCookie {
        (headers: any): void;
    }

    var s: SoapCookie;
    export = s;
}
