declare module "uniqid" {

    var u: u.IUniqid;

    namespace u {
        interface IUniqid {
        }
    }

    export = u;
}