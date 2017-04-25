declare namespace Express {
    export interface Request {
        memberUser?: MemberUser;
        staffUser?: StaffUser;
        windowUser?: WindowUser;
    }

    export class BaseUser {
        public isAuthenticated(): boolean;
        public get(key: string): any;
    }

    export class MemberUser extends BaseUser {
    }
    export class StaffUser extends BaseUser {
    }
    export class WindowUser extends BaseUser {
    }
}
