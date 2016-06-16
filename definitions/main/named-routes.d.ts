declare module "named-routes" {

    var n: n.INamedRoutes;

    namespace n {
        interface INamedRoutes {
            (options: Object): void;
            build(name, params, method?): string;
            extendExpress(app): INamedRoutes;
            registerAppHelpers(app): INamedRoutes;
        }
    }

    export = n;
}