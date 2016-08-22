"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const FilmUtil_1 = require('../../../common/models/Film/FilmUtil');
const TicketTypeGroupUtil_1 = require('../../../common/models/TicketTypeGroup/TicketTypeGroupUtil');
const conf = require('config');
const mongoose = require('mongoose');
const request = require('request');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class FilmController extends BaseController_1.default {
    createTicketTypeGroupsFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/ticketTypeGroups.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let groups = JSON.parse(data);
            this.logger.info('removing all groups...');
            Models_1.default.TicketTypeGroup.remove({}, (err) => {
                this.logger.debug('creating groups...');
                Models_1.default.TicketTypeGroup.create(groups, (err) => {
                    this.logger.info('groups created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/films.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let films = JSON.parse(data);
            this.logger.info('removing all films...');
            Models_1.default.Film.remove({}, (err) => {
                this.logger.debug('creating films...');
                Models_1.default.Film.create(films, (err) => {
                    this.logger.info('films created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * 券種グループを初期化する
     */
    createTicketTypeGroups() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.debug('removing all ticketTypeGroups...');
        Models_1.default.TicketTypeGroup.remove({}, (err) => {
            this.logger.debug('creating films...');
            Models_1.default.TicketTypeGroup.create(TicketTypeGroupUtil_1.default.getAll(), (err, documents) => {
                this.logger.debug('ticketTypeGroups created.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    /**
     * 作品を初期化する
     */
    createAll() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.TicketTypeGroup.find({}, '_id', (err, ticketTypeGroupDocuments) => {
            if (err) {
                this.logger.info('err:', err);
                mongoose.disconnect();
                process.exit(0);
            }
            let sections = FilmUtil_1.default.getSections();
            let testNames = FilmUtil_1.default.getTestNames();
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
            Models_1.default.Film.remove({}, (err) => {
                this.logger.debug('creating films...');
                Models_1.default.Film.create(films, (err, filmDocuments) => {
                    this.logger.debug('films created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * 作品画像を取得する
     */
    getImages() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Film.find({}, 'name', (err, filmDocuments) => {
            let next = (filmDocument) => {
                let options = {
                    url: `https://api.photozou.jp/rest/search_public.json?limit=1&keyword=${encodeURIComponent(filmDocument.get('name').ja)}`,
                    json: true
                };
                console.log(options.url);
                request.get(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        if (body.stat === 'ok' && body.info.photo) {
                            console.log(body.info.photo[0].image_url);
                            let image = body.info.photo[0].image_url;
                            // 画像情報更新
                            Models_1.default.Film.update({
                                _id: filmDocument.get('_id')
                            }, {
                                image: image
                            }, (err) => {
                                this.logger.debug('film udpated.');
                                if (i === filmDocuments.length - 1) {
                                    this.logger.debug('success!');
                                    mongoose.disconnect();
                                    process.exit(0);
                                }
                                else {
                                    i++;
                                    next(filmDocuments[i]);
                                }
                            });
                        }
                        else {
                            i++;
                            next(filmDocuments[i]);
                        }
                    }
                    else {
                        i++;
                        next(filmDocuments[i]);
                    }
                });
            };
            let i = 0;
            next(filmDocuments[i]);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilmController;
