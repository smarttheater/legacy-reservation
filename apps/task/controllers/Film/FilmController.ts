import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import conf = require('config');
import mongoose = require('mongoose');
import request = require('request');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class FilmController extends BaseController {
    public createTicketTypeGroupsFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/ticketTypeGroups.json`, 'utf8', (err, data) => {
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

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/films.json`, 'utf8', (err, data) => {
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
     * 作品画像を取得する
     */
    public getImages() {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Film.find({}, 'name', (err, films) => {
            let next = (film) => {
                let options = {
                    url: `https://api.photozou.jp/rest/search_public.json?limit=1&keyword=${encodeURIComponent(film.get('name').ja)}`,
                    json: true
                };

                request.get(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        if (body.stat === 'ok' && body.info.photo) {
                            console.log(body.info.photo[0].image_url)
                            let image = body.info.photo[0].image_url

                            request.get({url: image, encoding: null}, (error, response, body) => {
                                this.logger.debug('image saved.', error);
                                if (!error && response.statusCode === 200) {
                                    fs.writeFileSync(`${__dirname}/../../../../public/images/film/${film.get('_id').toString()}.jpg`, body, 'binary');
                                }

                                if (i === films.length - 1) {
                                    this.logger.debug('success!');
                                    mongoose.disconnect();
                                    process.exit(0);
                                } else {
                                    i++;
                                    next(films[i]);
                                }
                            });
                        } else {
                            i++;
                            next(films[i]);
                        }
                    } else {
                        i++;
                        next(films[i]);
                    }
                })
            }

            let i = 0;
            next(films[i]);
        });
    }
}
