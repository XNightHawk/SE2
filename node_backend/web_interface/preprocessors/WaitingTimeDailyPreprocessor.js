var enumify = require('enumify');
var Error = require('../../common/Error.js');
var HttpStatus = require('../../common/HttpStatus.js');
var ErrorType = require('../../common/ErrorType.js');

class WaitingTimeDailyAttributes {
    constructor(day) {
        this.day = day;    
    }
    getDay() {
        return this.day;
    }
    setDay(day) {
        this.day = day;
    }
}

class Days extends enumify.Enum {};
Days.initEnum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);

module.exports = class WaitingTimeDailyPreprocessor {
    constructor() {
        // DEFAULT CONSTRUCTOR
    }
    
    parseAndValidate(req) {
        var promiseFunction = function(resolve, reject) {
            var waitingTimeDailyAttributes = null;
            var day = null;
            var dayAttribute = req.query.day;
            var error = null;

            if(typeof dayAttribute === 'undefined' || dayAttribute === null) {
                var todayDate = new Date();
                var todayDay = todayDate.getDay();
                if(todayDay > 0 && todayDay <= 6) {
                    /* In JS the first day of the week (0) means
                    Sunday, while in our application means Monday */
                    dayAttribute = (todayDay - 1);
                } else {
                    dayAttribute = Days.SUNDAY.ordinal;
                }
            } else {
                dayAttribute = parseInt(dayAttribute);
            }

            switch(dayAttribute) {
                case Days.MONDAY.ordinal:
                    day = Days.MONDAY.ordinal;
                    break;
                case Days.TUESDAY.ordinal:
                    day = Days.TUESDAY.ordinal;
                    break;
                case Days.WEDNESDAY.ordinal:
                    day = Days.WEDNESDAY.ordinal;
                    break;
                case Days.THURSDAY.ordinal:
                    day = Days.THURSDAY.ordinal;
                    break;
                case Days.FRIDAY.ordinal:
                    day = Days.FRIDAY.ordinal;
                    break;
                case Days.SATURDAY.ordinal:
                    day = Days.SATURDAY.ordinal;
                    break;
                case Days.SUNDAY.ordinal:
                    day = Days.SUNDAY.ordinal;
                    break;
                default:
                    // At this point day will be equal to null and some error occurs
            }

            if(day === null) {
                error = new Error(HttpStatus.BAD_REQUEST, ErrorType.DAY_ERROR);
                reject(error);
            } else {
                waitingTimeDailyAttributes = new WaitingTimeDailyAttributes(day);
                resolve(waitingTimeDailyAttributes);    
            }
        }   
        
        return new Promise(promiseFunction);
    }   
        
}