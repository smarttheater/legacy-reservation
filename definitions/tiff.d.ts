declare namespace Express {
    export interface Request {
        mvtkUser?: MvtkUser;
        memberUser?: MemberUser;
        sponsorUser?: SponsorUser;
        staffUser?: StaffUser;
        telStaffUser?: TelStaffUser;
        windowUser?: WindowUser;
    }

    export class BaseUser {
        public isAuthenticated(): boolean;
        public get(key: string): any;
    }

    export class MvtkUser extends BaseUser {
    }
    export class MemberUser extends BaseUser {
    }
    export class SponsorUser extends BaseUser {
    }
    export class StaffUser extends BaseUser {
    }
    export class TelStaffUser extends BaseUser {
    }
    export class WindowUser extends BaseUser {
    }
}
