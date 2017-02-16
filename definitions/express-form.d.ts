declare namespace Express {
    export interface Request {
       form?: Form;
    }

    export interface Form {
        errors: Array<any>;
        getErrors(): Object;
        getErrors(name: string): Array<any>;
        isValid: boolean;
        flashErrors(): Object;
        flashErrors(name: string): any;
    }
}

declare module "express-form" {
    import * as express from 'express';

    function form(...args: any[]): express.RequestHandler;

    namespace form {
        export function field(property?: string, label?: string): Field;
        export function configure(options): any;

        export interface Field {
            (property?: string, label?: string): Field;
            array(): Field;
            arrLength(from: number, to: number): Field;
            custom(func: Function): Field;
            custom(func: Function, message?: string): Field;
            ifNull(replacement): Field;
            truncate(length: number): Field;
            contains(test, message?: string): Field;
            notContains(test, message?: string): Field;
            equals(other, message?: string): Field;
            regex(pattern: RegExp, message: string): Field;
            notRegex(message?: string): Field;
            required(placeholderValue?: string, message?: string): Field;
            minLength(length: number, message?: string): Field;
            maxLength(length: number, message?: string): Field;

            entityDecode(): Field;
            entityEncode(): Field;
            ltrim(chars?): Field;
            rtrim(chars?): Field;
            trim(chars?): Field;
            escape(func: Function, message?: string): Field;

            toFloat(): Field;
            toInt(): Field;
            toBoolean(): Field;
            toBooleanStrict(): Field;
            toUpper(): Field;
            toLower(): Field;

            isNumeric(message?: string): Field;
            isInt(message?: string): Field;
            isDecimal(message?: string): Field;
            isFloat(message?: string): Field;
            isDate(message?: string): Field;
            isEmail(message?: string): Field;
            isString(message?: string): Field;
            isUrl(message?: string): Field;
            isIP(message?: string): Field;
            isAlpha(message?: string): Field;
            isAlphanumeric(message?: string): Field;
            isLowercase(message?: string): Field;
            isUppercase(message?: string): Field;
        }
    }

    export = form;
}