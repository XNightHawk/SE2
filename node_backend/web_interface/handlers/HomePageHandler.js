var ApplicationHandlerSkeleton = require('../../ApplicationHandlerSkeleton.js');
var HomePagePreprocessor = require('../preprocessors/HomePagePreprocessor.js');
var CanteenDBHelper = require('../../database/helpers/CanteenDBHelper.js');
var CanteenEntity = require('../../database/entities/CanteenEntity.js');
var PrevisionDataDBHelper = require('../../database/helpers/PrevisionDataDBHelper.js');
var PrevisionDataEntity = require('../../database/entities/PrevisionDataEntity.js');
var OpeningHourDBHelper = require('../../database/helpers/OpeningHourDBHelper.js');
var OpeningHourEntity = require('../../database/entities/OpeningHourEntity.js');
var HttpStatus = require('../../common/HttpStatus.js');
var enumify = require('enumify');
var bind = require('bind');

class CanteenStatus extends enumify.Enum {};
CanteenStatus.initEnum({
    CLOSED: {
        id: 0,
    },
    FREE: {
        id: 1,
        threshold: 10,
    },
    BUSY: {
        id: 2,
        threshold: 20,
    },
    FULL: {
        id: 3,
        threshold: Number.MAX_SAFE_INTEGER,
    },
});

module.exports = class HomePageHandler extends ApplicationHandlerSkeleton {
    
    constructor() {
        var homePagePreprocessor = new HomePagePreprocessor();
        super(homePagePreprocessor);
    }

    processFailure(res, err) {
        var errorStatus = err.statusType.status;
        var errorDescription = err.descriptionType.errorDescription;
        bind.toFile('./node_backend/web_interface/tpl/error.tpl', {
            errorStatus: errorStatus,
            errorDescription: errorDescription
        }, function(data) {
            res.writeHead(errorStatus, {'Content-Type': 'text/html'});
            res.end(data);
        });
    }

    processRequest(res, homePageAttributes) {
        const SECONDS_PER_MINUTE = 60;
        var self = this;
        var canteenDBHelper = new CanteenDBHelper();
        var previsionDataDBHelper = new PrevisionDataDBHelper();
        var openingHourDBHelper = new OpeningHourDBHelper();
        var canteenStatus = [];
        var weekDay = homePageAttributes.getDay();
        var requestDate = homePageAttributes.getRequestDate();
        var savedCanteens;
             
        canteenDBHelper.getAllCanteens().then(function(canteens) {
            savedCanteens = canteens; 
            var promiseArray = [];
            
            for(var i = 0; i < canteens.length; i++) {          
                promiseArray.push(openingHourDBHelper.getOpeningHourByCanteenIdAndDay(canteens[i].canteenId, weekDay));
            }
            
            return Promise.all(promiseArray);
              
        }, function(err) {
            self.processFailure(res, err);
        }).then(function(openingHours) {
            var promiseArray = [];
            
            for(var i = 0; i < openingHours.length; i++) {
                if(openingHours[i] === null) {
                    promiseArray[i] = Promise.resolve(CanteenStatus.CLOSED.id);
                } else {
                    promiseArray[i] = previsionDataDBHelper.getPrevisionDataByCanteenIdAndTime(savedCanteens[i].canteenId, weekDay, requestDate);
                }
            }
            
            return Promise.all(promiseArray);
            
        }, function(err) {
            self.processFailure(res, err);
        }).then(function(previsionDataArray) {
            for(var i = 0; i < previsionDataArray.length; i++) {
                if(previsionDataArray[i] == CanteenStatus.CLOSED.id) {
                    canteenStatus[i] = CanteenStatus.CLOSED.id
                } else if(previsionDataArray[i] === null) {
                    canteenStatus[i] = CanteenStatus.CLOSED.id
                } else {
                    var waitMinutes = previsionDataArray[i].waitSeconds / SECONDS_PER_MINUTE;
                    if(waitMinutes >= 0) {
                        if(waitMinutes <= CanteenStatus.FREE.threshold) {
                            canteenStatus[i] = CanteenStatus.FREE.id;
                        } else if(waitMinutes <= CanteenStatus.BUSY.threshold) {
                            canteenStatus[i] = CanteenStatus.BUSY.id;
                        } else {
                            canteenStatus[i] = CanteenStatus.FULL.id;
                        }
                    } else {
                        var errorDescription = "Invalid result from database";
                        self.processInternalServerFailure(res, errorDescription);
                    }
                }
            }
            
            bind.toFile('./node_backend/web_interface/tpl/home.tpl', {
                    canteenAffStatus_1: canteenStatus[0],
                    canteenAffStatus_2: canteenStatus[1],
                    canteenAffStatus_3: canteenStatus[2]
            }, function(data) {
                    res.writeHead(HttpStatus.OK.status, {'Content-Type': 'text/html'});
                    res.end(data);
            }); 
        }, function(err) {
            self.processFailure(res, err);
        });
    }
    
}
                                             
                                              