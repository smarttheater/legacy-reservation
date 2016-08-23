"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const conf = require('config');
const mongoose = require('mongoose');
const request = require('request');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class FilmController extends BaseController_1.default {
    createTicketTypeGroupsFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/ticketTypeGroups.json`, 'utf8', (err, data) => {
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
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/films.json`, 'utf8', (err, data) => {
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
