declare namespace Express {
    export interface Request {
       form?: Form;
    }

    export interface Form {
        [key: string]: any;

        errors: Array<any>;
        getErrors: (name?: string) => any;
        isValid: () => boolean;
        flashErrors: (name?: string) => any;
    }
}

declare module "express-form" {
    import express = require('express');

    function form(...args: any[]): express.RequestHandler;

    namespace form {
      export function field(property?, label?): any
      export function configure(options): any
    }

    export = form;
}