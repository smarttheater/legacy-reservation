/**
 * ペイデザイン入金モデル
 */
export default class PayDesignNotificationModel {
    public static parse(postParameters: Object): PayDesignNotificationModel {
        let model = new PayDesignNotificationModel();

        for (let propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }

        return model;
    }
}
