declare namespace Express {
    export interface Application {
       namedRoutes?: NamedRoutes;
    }

    export interface NamedRoutes {
        new(options?: Object): NamedRoutes;
        build(name: string, params?: Object, method?: string): string;
        extendExpress(app: Application): NamedRoutes;
        registerAppHelpers(app: Application): NamedRoutes;
    }
}

declare module "named-routes" {
    import express = require('express');

    let n: Express.NamedRoutes;

    export = n;
}
