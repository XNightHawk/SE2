var ApplicationHandlerSkeleton = require('../../ApplicationHandlerSkeleton.js');
var WaitingTimeDailyPreprocessor = require('../preprocessors/WaitingTimeDailyPreprocessor.js');
var CanteenEntity = require('../../database/entities/CanteenEntity.js');
var CanteenDBHelper = require('../../database/helpers/CanteenDBHelper.js');
var PrevisionDataEntity = require('../../database/entities/PrevisionDataEntity.js');
var PrevisionDataDBHelper = require('../../database/helpers/PrevisionDataDBHelper.js');
var OpeningHourEntity = require('../../database/entities/OpeningHourEntity.js');
var OpeningHourDBHelper = require('../../database/helpers/OpeningHourDBHelper.js');
var TimeChecker = require('../../common/TimeChecker.js');
var bind = require('bind');

class StatisticalData {
    constructor(time, waitingTimes) {
        this.time = time;
        this.waitingTimes = waitingTimes;
    }
}

module.exports = class WaitingTimeDailyHandler extends ApplicationHandlerSkeleton {  
    constructor() {
        var preprocessor = new WaitingTimeDailyPreprocessor();
        super(preprocessor);
    }
    
    processParseOfValidationFailure(res, errorDescription) {
        res.status(500);
        res.end(errorDescription);
    }
    
    addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes*60000);
    }
    
    getDateByTime(time) {
        const HOURS_INDEX = 0;
        const MINUTES_INDEX = 1;
        var dateTime = new Date();
        var splittedTime = time.split(":",2);
        var hours = splittedTime[HOURS_INDEX];
        var minutes = splittedTime[MINUTES_INDEX];
        dateTime.setHours(hours);
        dateTime.setMinutes(minutes);
        dateTime.setSeconds(0);
        dateTime.setMilliseconds(0);
        
        return dateTime;
    }
    
    // Search for a previsionData which has an arrive time equal to time
    getPrevisionDataByTime(previsionsData, time) {
        var previsionData = null;
        for(var i = 0; i < previsionsData.length && previsionData === null; i++) {
            var arriveTime = self.getDateByTime(previsionsData[i].arriveTime);
            if(TimeChecker.compareHoursMinutesTimes(arriveTime, time) == 0)
                previsionData = previsionData[i];
        }
        return previsionData;
    }
    
    // This method has to be called if and only if openingHours contains at least a non null element
    getMinOpenDateTime(openingHours) {
        var minOpenDateTime = new Date(8640000000000000); // latest date
        for(var i = 0; i < openingHours.length; i++) {
            var openDateTime = this.getDateByTime(openingHours[i].openTime);
            if(openingHours[i] !== null && openDateTime < minOpenDateTime) 
                minOpenDateTime = openDateTime;
            }
        return minOpenDateTime;
    }  
        
    
    // This method has to be called if and only if openingHours contains at least a non null element
    getMaxCloseDateTime(openingHours) {
        var maxCloseDateTime = new Date(-8640000000000000); // earliest date
        for(var i = 0; i < openingHours.length; i++) {
            var closeDateTime = this.getDateByTime(openingHours[i].closeTime);
            if(openingHours[i] !== null && closeDateTime > maxCloseDateTime) 
                maxCloseDateTime = closeDateTime;
        }
        return maxCloseDateTime;
    }  
    
    processRequest(res, waitingTimeDailyAttributes) {
        var self = this;
        var canteenDBHelper = new CanteenDBHelper();
        var previsionDataDBHelper = new PrevisionDataDBHelper();
        var openingHourDBHelper = new OpeningHourDBHelper();
        var weekDay = waitingTimeDailyAttributes.getDay();
        var dailyStatistics = [];
        var previsionsData = [];
        var openingHours = [];
        var isEmptyOpeningHours = true;
        var statisticalData = null;
        var canteensPrevisionData = [];
        var savedCanteens;
        var savedOpeningHours;
        canteenDBHelper.getAllCanteens().then(function(canteens) {
            savedCanteens = canteens;
            var promiseArray = [];
            
            for(var i = 0; i < canteens.length; i++) {
                var canteenId = canteens[i].canteenId;
                promiseArray[i] = openingHourDBHelper.getOpeningHourByCanteenIdAndDay(canteenId, weekDay); 
            }
            
            return Promise.all(promiseArray);
            
        }, function(err) {
            console.log(err);
        }).then(function(openingHours) {
            savedOpeningHours = openingHours;
            var promiseArray = [];
            
            for(var i = 0; i < openingHours.length; i++) {
                if(openingHours[i] !== null) {
                    promiseArray[i] = previsionDataDBHelper.getPrevisionDataByCanteenIdAndDay(savedCanteens[i].canteenId, weekDay);
                } else {
                    promiseArray[i] = Promise.resolve(null);
                }
            }
            
            return Promise.all(promiseArray);
            
        }, function(err) {
            console.log(err);
        }).then(function(previsionDataArray) {
            var minOpenDateTime = self.getMinOpenDateTime(savedOpeningHours);
            var maxCloseDateTime = self.getMaxCloseDateTime(savedOpeningHours);
       
            for(var timeIterator = minOpenDateTime; timeIterator <= maxCloseDateTime; timeIterator = self.addMinutes(timeIterator, 1)) {

                for(var j = 0; j < previsionDataArray.length; j++) {
                    // If canteen[j] is open at a given time then waiting time will be set to number of 
                    // minutes of waiting at that time, else waiting time will be set to null
                    if(previsionDataArray[j] === null) {
                        canteensPrevisionData[j] = null; // Closed canteen due to closed canteen or no prevision for that canteen
                    } else {
                        canteensPrevisionData[j] = (self.getPrevisionDataByTime(previsionDataArray[j], timeIterator)).waitSeconds / 60; 
                    }
                    
                }

                var statisticalData = new StatisticalData(timeIterator, canteensPrevisionData);    
                dailyStatistics.push(statisticalData);

            }
            
            var dailyStatisticsJSON = {
                statistics: dailyStatistics
            };

            bind.toFile('./web_interface/tpl/compchart.tpl', {
                dailyStatistics: JSON.stringify(dailyStatisticsJSON)
            }, function(data) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            });

        }, function(err) {
            console.log(err);
        });

    }
        
}