declare module "uniqid" {

    var u: u.IUniqid;

    namespace u {
        interface IUniqid {
            (prefix?: string): string;
            process(prefix?: string): string;
            time(prefix?: string): string;
        }
    }

    export = u;
}
