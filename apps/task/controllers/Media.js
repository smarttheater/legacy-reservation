"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Base_1 = require('./Base');
var Media_1 = require('../models/Media');
var azureMediaService_1 = require('../../common/modules/azureMediaService');
var azureFileService_1 = require('../../common/modules/azureFileService');
var fs = require('fs');
var util = require('util');
var azure = require('azure-storage');
var Media = (function (_super) {
    __extends(Media, _super);
    function Media() {
        _super.apply(this, arguments);
    }
    /**
     * エンコード処理を施す
     */
    Media.prototype.encode = function () {
        var _this = this;
        var model = new Media_1.default();
        model.getListByStatus(Media_1.default.STATUS_ASSET_CREATED, 10, function (err, rows) {
            if (err)
                throw err;
            _this.logger.trace('medias count:', rows.length);
            azureMediaService_1.default.setToken(function (err) {
                if (err)
                    throw err;
                var i = 0;
                var next = function () {
                    i++;
                    if (i > rows.length) {
                        process.exit(0);
                    }
                    var media = rows[i - 1];
                    _this.logger.debug('creating job...media.id:', media.id);
                    var assetId = media.asset_id;
                    var options = {
                        Name: 'AassJob[' + media.filename + ']',
                        Tasks: _this.getTasks(media.filename)
                    };
                    Promise.resolve().then(function () {
                        // ジョブ作成
                        return new Promise(function (resolve, reject) {
                            azureMediaService_1.default.createMultiTaskJob(assetId, options, function (error, response) {
                                _this.logger.debug('error:', error);
                                _this.logger.debug('response body:', response.body);
                                if (error)
                                    throw error;
                                var job = JSON.parse(response.body).d;
                                _this.logger.trace('job created. job:', job);
                                resolve(job);
                            });
                        });
                    }).then(function (job) {
                        // メディアにジョブを登録
                        model.addJob(media.id, job.Id, job.State, function (err, result) {
                            if (err)
                                throw err;
                            _this.logger.trace('media added job. id:', media.id, ' / result:', result);
                            return next();
                        });
                    });
                };
                next();
            });
        });
    };
    /**
     * ジョブタスクリストを取得する
     */
    Media.prototype.getTasks = function (filename) {
        var task;
        var tasks = [];
        // thumbnail task
        var config = fs.readFileSync(__dirname + '/../../../config/thumbnailConfig.json').toString();
        task = {
            Configuration: config,
            OutputAssetName: 'AassMediaAsset[' + filename + '][thumbnails]'
        };
        tasks.push(task);
        // single bitrate mp4 task
        task = {
            Configuration: 'H264 Single Bitrate 1080p',
            OutputAssetName: 'AassMediaAsset[' + filename + '][H264SingleBitrate1080p]',
        };
        tasks.push(task);
        // adaptive bitrate mp4 task
        task = {
            Configuration: 'H264 Multiple Bitrate 1080p',
            OutputAssetName: 'AassMediaAsset[' + filename + '][H264MultipleBitrate1080p]',
        };
        tasks.push(task);
        return tasks;
    };
    /**
     * ジョブタスク進捗を取得する
     */
    Media.prototype.getTaskProgress = function () {
        var _this = this;
        var model = new Media_1.default();
        Promise.resolve().then(function () {
            return new Promise(function (resolve, reject) {
                azureMediaService_1.default.setToken(function (err) {
                    if (err)
                        throw err;
                    resolve();
                });
            });
        }).then(function () {
            return new Promise(function (resolve, reject) {
                model.getListByStatus(Media_1.default.STATUS_JOB_CREATED, 10, function (err, rows) {
                    if (err)
                        throw err;
                    _this.logger.trace('medias count:', rows.length);
                    resolve(rows);
                });
            });
        }).then(function (medias) {
            return new Promise(function (resolve, reject) {
                var i = 0;
                var next = function () {
                    i++;
                    if (i > medias.length) {
                        return resolve();
                    }
                    var media = medias[i - 1];
                    _this.logger.trace('getting job...media.id:', media.id);
                    var assetId = media.asset_id;
                    var options = {
                        Name: 'AassJob[' + media.filename + ']',
                        Tasks: _this.getTasks(media.filename)
                    };
                    azureMediaService_1.default.getJobTasks(media.job_id, function (error, response) {
                        if (error)
                            throw error;
                        var tasks = JSON.parse(response.body).d.results;
                        _this.logger.trace('job task1 progress:', tasks[0].Progress);
                        _this.logger.trace('job task2 progress:', tasks[1].Progress);
                        _this.logger.trace('job task3 progress:', tasks[2].Progress);
                        var progresses = {
                            thumbnail: Math.floor(tasks[0].Progress),
                            mp4: Math.floor(tasks[1].Progress),
                            streaming: Math.floor(tasks[2].Progress)
                        };
                        _this.logger.trace('updating tasks progress... id:', media.id);
                        model.updateTaskProgress(media.id, progresses, function (err, result) {
                            if (err)
                                throw err;
                            _this.logger.trace('tasks progress updated. id:', media.id, ' / result:', result);
                            return next();
                        });
                    });
                };
                next();
            });
        }).then(function () {
            process.exit(0);
        });
    };
    /**
     * ジョブ進捗を確認する
     */
    Media.prototype.checkJob = function () {
        var _this = this;
        var model = new Media_1.default();
        model.getListByStatus(Media_1.default.STATUS_JOB_CREATED, 10, function (err, rows) {
            if (err)
                throw err;
            _this.logger.trace('medias count:', rows.length);
            azureMediaService_1.default.setToken(function (err) {
                if (err)
                    throw err;
                var i = 0;
                var next = function () {
                    i++;
                    if (i > rows.length) {
                        process.exit(0);
                    }
                    var media = rows[i - 1];
                    _this.logger.trace('getting job state...media.id:', media.id);
                    azureMediaService_1.default.getJobStatus(media.job_id, function (error, response) {
                        if (error)
                            throw error;
                        var job = JSON.parse(response.body).d;
                        _this.logger.trace('job exists. job:', job);
                        // ジョブのステータスを更新
                        if (media.job_state != job.State) {
                            var state = job.State;
                            _this.logger.trace('job state change. new state:', state);
                            // ジョブが完了の場合、URL発行プロセス
                            if (state == azureMediaService_1.default.JOB_STATE_FINISHED) {
                                // ジョブに関する情報更新と、URL更新
                                _this.logger.trace('changing status to STATUS_JOB_FINISHED... id:', media.id);
                                model.updateJobState(media.id, state, Media_1.default.STATUS_JOB_FINISHED, function (err, result) {
                                    if (err)
                                        throw err;
                                    _this.logger.trace('status changed. id:', media.id, ' / result:', result);
                                    next();
                                });
                            }
                            else if (state == azureMediaService_1.default.JOB_STATE_ERROR || state == azureMediaService_1.default.JOB_STATE_CANCELED) {
                                _this.logger.trace("changing status to STATUS_ERROR... id:", media.id);
                                model.updateJobState(media.id, state, Media_1.default.STATUS_ERROR, function (err, result) {
                                    next();
                                });
                            }
                            else {
                                model.updateJobState(media.id, state, Media_1.default.STATUS_JOB_CREATED, function (err, result) {
                                    next();
                                });
                            }
                        }
                        else {
                            next();
                        }
                    });
                };
                next();
            });
        });
    };
    /**
     * URLを発行する
     */
    Media.prototype.publish = function () {
        var _this = this;
        var model = new Media_1.default();
        model.getListByStatus(Media_1.default.STATUS_JOB_FINISHED, 10, function (err, rows) {
            if (err)
                throw err;
            _this.logger.trace('medias count:', rows.length);
            azureMediaService_1.default.setToken(function (err) {
                if (err)
                    throw err;
                var i = 0;
                var next = function () {
                    i++;
                    if (i > rows.length) {
                        process.exit(0);
                    }
                    var media = rows[i - 1];
                    // ジョブが完了の場合、URL発行プロセス
                    if (media.job_state == azureMediaService_1.default.JOB_STATE_FINISHED) {
                        azureMediaService_1.default.getJobOutputMediaAssets(media.job_id, function (error, response) {
                            if (error)
                                throw error;
                            var outputMediaAssets = JSON.parse(response.body).d.results;
                            _this.logger.trace('outputMediaAssets:', outputMediaAssets);
                            if (outputMediaAssets.length > 0) {
                                var urls_1 = {};
                                var p1 = new Promise(function (resolve, reject) {
                                    _this.createUrlOrigin(media.asset_id, media.filename, media.extension, function (error, url) {
                                        if (error)
                                            reject(error);
                                        urls_1.origin = url;
                                        resolve();
                                    });
                                });
                                var p2 = new Promise(function (resolve, reject) {
                                    _this.createUrlThumbnail(outputMediaAssets[0].Id, media.filename, function (error, url) {
                                        if (error)
                                            reject(error);
                                        urls_1.thumbnail = url;
                                        resolve();
                                    });
                                });
                                var p3 = new Promise(function (resolve, reject) {
                                    _this.createUrlMp4(outputMediaAssets[1].Id, media.filename, function (error, url) {
                                        if (error)
                                            reject(error);
                                        urls_1.mp4 = url;
                                        resolve();
                                    });
                                });
                                var p4 = new Promise(function (resolve, reject) {
                                    _this.createUrl(outputMediaAssets[2].Id, media.filename, function (error, url) {
                                        if (error)
                                            reject(error);
                                        urls_1.streaming = url;
                                        resolve();
                                    });
                                });
                                Promise.all([p1, p2, p3, p4]).then(function () {
                                    // URL更新
                                    _this.logger.trace('urls created. urls:', urls_1);
                                    _this.logger.trace('publishing... id:', media.id);
                                    model.publish(media.id, urls_1, function (err, result) {
                                        if (err)
                                            throw err;
                                        _this.logger.trace('published. id:', media.id, ' / result:', result);
                                        // TODO URL通知
                                        // if (!is_null(url)) {
                                        //     this->sendEmail(media);
                                        // }
                                        next();
                                    });
                                }, function (err) {
                                    throw err;
                                });
                            }
                        });
                    }
                };
                next();
            });
        });
    };
    Media.prototype.createUrlOrigin = function (assetId, filename, extension, cb) {
        var _this = this;
        // 読み取りアクセス許可を持つAccessPolicyの作成
        azureMediaService_1.default.createAccessPolicy({
            Name: 'OriginPolicy',
            DurationInMinutes: 25920000,
            Permissions: azureMediaService_1.default.ACCESS_POLICY_PERMISSIONS_READ
        }, function (error, response) {
            if (error)
                throw error;
            var accessPolicy = JSON.parse(response.body).d;
            _this.logger.debug('accessPolicy:', accessPolicy);
            // 元ファイル用のURL作成
            var d = new Date();
            d.setMinutes(d.getMinutes() - 5);
            var startTime = d.toISOString();
            azureMediaService_1.default.createLocator({
                AccessPolicyId: accessPolicy.Id,
                AssetId: assetId,
                StartTime: startTime,
                Type: azureMediaService_1.default.LOCATOR_TYPE_SAS,
                Name: 'OriginLocator_' + assetId
            }, function (error, response) {
                if (error)
                    throw error;
                var locator = JSON.parse(response.body).d;
                _this.logger.debug('locator:', locator);
                // URLを生成
                var url = util.format('%s/%s.%s%s', locator.BaseUri, filename, extension, locator.ContentAccessComponent);
                _this.logger.trace('origin url created. url:', url);
                cb(null, url);
            });
        });
    };
    Media.prototype.createUrlThumbnail = function (assetId, filename, cb) {
        var _this = this;
        // 読み取りアクセス許可を持つAccessPolicyの作成
        azureMediaService_1.default.createAccessPolicy({
            Name: 'ThumbnailPolicy',
            DurationInMinutes: 25920000,
            Permissions: azureMediaService_1.default.ACCESS_POLICY_PERMISSIONS_READ
        }, function (error, response) {
            if (error)
                throw error;
            var accessPolicy = JSON.parse(response.body).d;
            _this.logger.debug('accessPolicy:', accessPolicy);
            // サムネイル用のURL作成
            var d = new Date();
            d.setMinutes(d.getMinutes() - 5);
            var startTime = d.toISOString();
            azureMediaService_1.default.createLocator({
                AccessPolicyId: accessPolicy.Id,
                AssetId: assetId,
                StartTime: startTime,
                Type: azureMediaService_1.default.LOCATOR_TYPE_SAS,
                Name: 'ThumbnailLocator_' + assetId
            }, function (error, response) {
                if (error)
                    throw error;
                var locator = JSON.parse(response.body).d;
                _this.logger.debug('locator:', locator);
                // URLを生成
                var url = util.format('%s/%s_000001.jpg%s', locator.BaseUri, filename, locator.ContentAccessComponent);
                _this.logger.trace('thumbnail url created. url:', url);
                cb(null, url);
            });
        });
    };
    Media.prototype.createUrlMp4 = function (assetId, filename, cb) {
        var _this = this;
        // 読み取りアクセス許可を持つAccessPolicyの作成
        azureMediaService_1.default.createAccessPolicy({
            Name: 'MP4Policy',
            DurationInMinutes: 25920000,
            Permissions: azureMediaService_1.default.ACCESS_POLICY_PERMISSIONS_READ
        }, function (error, response) {
            if (error)
                throw error;
            var accessPolicy = JSON.parse(response.body).d;
            _this.logger.debug('accessPolicy:', accessPolicy);
            // サムネイル用のURL作成
            var d = new Date();
            d.setMinutes(d.getMinutes() - 5);
            var startTime = d.toISOString();
            azureMediaService_1.default.createLocator({
                AccessPolicyId: accessPolicy.Id,
                AssetId: assetId,
                StartTime: startTime,
                Type: azureMediaService_1.default.LOCATOR_TYPE_SAS,
                Name: 'MP4Locator_' + assetId
            }, function (error, response) {
                if (error)
                    throw error;
                var locator = JSON.parse(response.body).d;
                _this.logger.debug('locator:', locator);
                // URLを生成
                var url = util.format('%s/%s_1920x1080_6750.mp4%s', locator.BaseUri, filename, locator.ContentAccessComponent);
                _this.logger.trace('mp4 url created. url:', url);
                cb(null, url);
            });
        });
    };
    // http://msdn.microsoft.com/ja-jp/library/jj889436.aspx
    Media.prototype.createUrl = function (assetId, filename, cb) {
        var _this = this;
        // 読み取りアクセス許可を持つAccessPolicyの作成
        azureMediaService_1.default.createAccessPolicy({
            Name: 'StreamingPolicy',
            DurationInMinutes: 25920000,
            Permissions: azureMediaService_1.default.ACCESS_POLICY_PERMISSIONS_READ
        }, function (error, response) {
            if (error)
                throw error;
            var accessPolicy = JSON.parse(response.body).d;
            _this.logger.debug('accessPolicy:', accessPolicy);
            var d = new Date();
            d.setMinutes(d.getMinutes() - 5);
            var startTime = d.toISOString();
            azureMediaService_1.default.createLocator({
                AccessPolicyId: accessPolicy.Id,
                AssetId: assetId,
                StartTime: startTime,
                Type: azureMediaService_1.default.LOCATOR_TYPE_ON_DEMAND_ORIGIN,
                Name: 'StreamingLocator_' + assetId
            }, function (error, response) {
                if (error)
                    throw error;
                var locator = JSON.parse(response.body).d;
                _this.logger.debug('locator:', locator);
                // URLを生成
                var url = util.format('%s/%s.ism/Manifest', locator.Path, filename);
                _this.logger.trace('streaming url created. url:', url);
                cb(null, url);
            });
        });
    };
    /**
     * JPEG2000エンコード状態を確認する
     */
    Media.prototype.checkJpeg2000Encode = function () {
        var _this = this;
        var model = new Media_1.default();
        model.getListByStatus(Media_1.default.STATUS_JPEG2000_READY, 10, function (err, rows) {
            if (err)
                throw err;
            var i = 0;
            var next = function () {
                i++;
                if (i > rows.length) {
                    process.exit(0);
                }
                var media = rows[i - 1];
                var share = Media_1.default.AZURE_FILE_SHARE_NAME_JPEG2000_ENCODED;
                var directory = Media_1.default.AZURE_FILE_DIRECTORY_JPEG2000_ENCODED;
                var extension = Media_1.default.EXTENSION_JPEG2000_ENCODED;
                var file = media.filename + '.' + extension;
                azureFileService_1.default.doesFileExist(share, directory, file, {}, function (error, result, response) {
                    if (error)
                        throw error;
                    _this.logger.trace('doesFileExist result:', result);
                    if (result.exists) {
                        _this.logger.trace('changing status to encoded... id:', media.id);
                        model.updateStatus(media.id, Media_1.default.STATUS_JPEG2000_ENCODED, function (err, result) {
                            if (err)
                                throw err;
                            _this.logger.trace('status changed to STATUS_JPEG2000_ENCODED. id:', media.id);
                            next();
                        });
                    }
                    else {
                        _this.logger.trace('not encoded yet. id:', media.id);
                        next();
                    }
                });
            };
            next();
        });
    };
    Media.prototype.publishJpeg2000 = function () {
        var _this = this;
        var model = new Media_1.default();
        model.getListByStatus(Media_1.default.STATUS_JPEG2000_ENCODED, 10, function (err, rows) {
            if (err)
                throw err;
            var i = 0;
            var next = function () {
                i++;
                if (i > rows.length) {
                    process.exit(0);
                }
                var media = rows[i - 1];
                var share = Media_1.default.AZURE_FILE_SHARE_NAME_JPEG2000_ENCODED;
                var directory = Media_1.default.AZURE_FILE_DIRECTORY_JPEG2000_ENCODED;
                var extension = Media_1.default.EXTENSION_JPEG2000_ENCODED;
                var file = media.filename + '.' + extension;
                // 期限つきのURLを発行する
                var startDate = new Date();
                var expiryDate = new Date();
                startDate.setMinutes(startDate.getMinutes() - 5);
                expiryDate.setMinutes(expiryDate.getMinutes() + 25920000);
                var sharedAccessPolicy = {
                    AccessPolicy: {
                        Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
                        Start: startDate,
                        Expiry: expiryDate,
                    }
                };
                var signature = azureFileService_1.default.generateSharedAccessSignature(share, directory, file, sharedAccessPolicy, null);
                var url = azureFileService_1.default.getUrl(share, directory, file, signature, true);
                _this.logger.trace('publishing jpeg2000... id:', media.id);
                model.publishJpeg2000(media.id, url, function (err, result) {
                    if (err)
                        throw err;
                    _this.logger.trace('published jpeg2000. id:', media.id, ' / result:', result);
                    // TODO URL通知
                    // if (!is_null(url)) {
                    //     this->sendEmail(media);
                    // }
                    next();
                });
            };
            next();
        });
    };
    /**
     * メディアを物理削除する
     */
    Media.prototype.delete = function () {
        var _this = this;
        var model = new Media_1.default();
        model.getListByStatus(Media_1.default.STATUS_DELETED, 10, function (err, rows) {
            if (err)
                throw err;
            azureMediaService_1.default.setToken(function (err) {
                if (err)
                    throw err;
                var i = 0;
                var next = function () {
                    i++;
                    if (i > rows.length) {
                        process.exit(0);
                    }
                    var media = rows[i - 1];
                    _this.logger.trace('deleting asset... asset_id:', media.asset_id);
                    azureMediaService_1.default.removeAsset(media.asset_id, function (error, response) {
                        if (error)
                            throw error;
                        _this.logger.trace('removeAsset response body:', response.body);
                        _this.logger.trace('deleting media... id:', media.id);
                        model.delete(media.id, function (err, result) {
                            if (err)
                                throw err;
                            _this.logger.trace('media deleted. id:', media.id);
                            next();
                        });
                    });
                };
                next();
            });
        });
    };
    return Media;
}(Base_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Media;
