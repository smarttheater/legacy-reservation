import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import PerformanceUtil from '../../../common/models/Performance/PerformanceUtil';
import FilmUtil from '../../../common/models/Film/FilmUtil';
import TicketTypeGroupUtil from '../../../common/models/TicketTypeGroup/TicketTypeGroupUtil';
import ScreenUtil from '../../../common/models/Screen/ScreenUtil';
import moment = require('moment');
import conf = require('config');
import mongoose = require('mongoose');
import request = require('request');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class FilmController extends BaseController {
    public createTicketTypeGroupsFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/ticketTypeGroups.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let groups = JSON.parse(data);

            this.logger.info('removing all groups...');
            Models.TicketTypeGroup.remove({}, (err) => {
                this.logger.debug('creating groups...');
                Models.TicketTypeGroup.create(
                    groups,
                    (err) => {
                        this.logger.info('groups created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/films.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let films = JSON.parse(data);

            this.logger.info('removing all films...');
            Models.Film.remove({}, (err) => {
                this.logger.debug('creating films...');
                Models.Film.create(
                    films,
                    (err) => {
                        this.logger.info('films created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    /**
     * 券種グループを初期化する
     */
    public createTicketTypeGroups(): void {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.debug('removing all ticketTypeGroups...');
        Models.TicketTypeGroup.remove({}, (err) => {
            this.logger.debug('creating films...');
            Models.TicketTypeGroup.create(
                TicketTypeGroupUtil.getAll(),
                (err, documents) => {
                    this.logger.debug('ticketTypeGroups created.', err);

                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        });
    }

    /**
     * 作品を初期化する
     */
    public createAll(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.TicketTypeGroup.find({}, '_id', (err, ticketTypeGroupDocuments) => {
            if (err) {
                this.logger.info('err:', err);
                mongoose.disconnect();
                process.exit(0);
            }

            let sections = FilmUtil.getSections();
            let testNames = FilmUtil.getTestNames();
            let length = testNames.length;
            let films = [];

            this.logger.info('ticketTypeGroupDocuments.length:', ticketTypeGroupDocuments.length);
            for (let i = 0; i < length; i++) {
                let no = i + 1;
                let _id = ('000000' + no).slice(-6);
                let _sections = this.shuffle(sections);
                let _ticketTypeGroupDocuments = this.shuffle(ticketTypeGroupDocuments);
                let minutes = 60 + Math.floor(Math.random() * 120);

                films.push({
                    _id: _id,
                    name: testNames[i].name,
                    sections: _sections.slice(0, Math.floor(Math.random() * 5)),
                    ticket_type_group: _ticketTypeGroupDocuments[0].get('_id'),
                    minutes: minutes,
                    is_mx4d: this.shuffle([true, false, false, false])[0]
                });
            }

            this.logger.debug('removing all films...');
            Models.Film.remove({}, (err) => {
                this.logger.debug('creating films...');
                Models.Film.create(
                    films,
                    (err, filmDocuments) => {
                        this.logger.debug('films created.', err);

                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });

        });

    }

    /**
     * 作品画像を取得する
     */
    public getImages() {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Film.find({}, 'name', (err, filmDocuments) => {

            let next = (filmDocument) => {
                let options = {
                    url: `https://api.photozou.jp/rest/search_public.json?limit=1&keyword=${encodeURIComponent(filmDocument.get('name').ja)}`,
                    json: true
                };

                console.log(options.url);

                request.get(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        if (body.stat === 'ok' && body.info.photo) {
                            console.log(body.info.photo[0].image_url)
                            let image = body.info.photo[0].image_url

                            // 画像情報更新
                            Models.Film.update(
                                {
                                    _id: filmDocument.get('_id')
                                },
                                {
                                    image: image
                                },
                                (err) => {
                                    this.logger.debug('film udpated.');

                                    if (i === filmDocuments.length - 1) {
                                        this.logger.debug('success!');

                                        mongoose.disconnect();
                                        process.exit(0);

                                    } else {
                                        i++;
                                        next(filmDocuments[i]);

                                    }

                                }
                            );

                        } else {
                            i++;
                            next(filmDocuments[i]);

                        }

                    } else {
                        i++;
                        next(filmDocuments[i]);

                    }
                })


            }

            let i = 0;
            next(filmDocuments[i]);

        });
    }
}
