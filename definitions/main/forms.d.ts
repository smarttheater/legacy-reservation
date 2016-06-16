declare module "forms" {
    namespace f {
        interface IForms {
            widgets: any;
            fields: any;
            render: any;
            validators: any;
            create(fields, options?): IForm;
        }

        interface IForm {
            fields: any;
            data: any;
            bind(data: any): IForm;
            handle(obj: any, callbacks: any): void;
            toHTML(iterator?: any): string;
            validate(): void;
            isValid(): boolean;
        }
    }

    var f: f.IForms;
    export = f;
}
