declare module "named-routes" {
    import express = require('express');

    var n: n.INamedRoutes;

    namespace n {
        interface INamedRoutes {
            (options: Object): void;
            build(name: string, params?: Object, method?: string): string;
            extendExpress(app: express.Application): INamedRoutes;
            registerAppHelpers(app: express.Application): INamedRoutes;
        }
    }

    export = n;
}