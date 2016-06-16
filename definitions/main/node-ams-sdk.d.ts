declare module "node-ams-sdk" {

    var a: a.IAzureMediaService;

    namespace a {
        interface IAzureMediaService {
            (config: any): void;
        }
    }

    export = a;
}