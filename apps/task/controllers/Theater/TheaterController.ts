import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TheaterController extends BaseController {
    public createScreensFromJson() : void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/screens.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let screens = JSON.parse(data);
            // 座席数情報を追加
            screens = screens.map((screen) => {
                screen.seats_number = screen.sections[0].seats.length;
                return screen;
            });

            this.logger.info('removing all screens...');
            Models.Screen.remove({}, (err) => {
                this.logger.info('creating screens...');
                Models.Screen.create(
                    screens,
                    (err) => {
                        this.logger.info('screens created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/theaters.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let theaters = JSON.parse(data);

            this.logger.info('removing all theaters...');
            Models.Theater.remove({}, (err) => {
                Models.Theater.create(theaters, (err) => {
                    this.logger.info('theaters created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            })
        });
    }
}
