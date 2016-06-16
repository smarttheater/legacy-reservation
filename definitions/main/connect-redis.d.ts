declare module "connect-redis" {
   interface IConnectRedis {
        (session: any): any;
    }

    var c: IConnectRedis;
    export = c;
}