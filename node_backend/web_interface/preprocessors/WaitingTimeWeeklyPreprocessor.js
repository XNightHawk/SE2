var enumify = require('enumify');
var Error = require('../../common/Error.js');
var HttpStatus = require('../../common/HttpStatus.js');
var ErrorType = require('../../common/ErrorType.js');

class Canteens extends enumify.Enum {};
Canteens.initEnum({
    PASTO_LESTO: {
        id: 1,
    },
    POVO_0: {
        id: 2,
    },
    POVO_1: {
        id: 3,
    },
});

class WaitingTimeWeeklyAttributes {
    constructor(canteenId) {
        this.canteenId = canteenId;    
    }
    getCanteenId() {
        return this.canteenId;
    }
    setCanteenId(canteenId) {
        this.canteenId = canteenId;
    }
}

module.exports = class WaitingTimeDailyPreprocessor {
    constructor() {
        // DEFAULT CONSTRUCTOR
    }
    
    parseAndValidate(req) {
        var promiseFunction = function(resolve, reject) {
            var waitingTimeWeeklyAttributes = null;
            var canteenId = null;
            var canteenIdAttribute = req.query.canteenId;
            var error = null;

            // If canteen id which is passed by front-end is null then PASTO_LESTO will be set
            if(typeof canteenIdAttribute === 'undefined' || canteenIdAttribute === null) {
                canteenIdAttribute = Canteens.PASTO_LESTO.id;
            }
            
            canteenIdAttribute = parseInt(canteenIdAttribute);
            switch(canteenIdAttribute) {
                case Canteens.PASTO_LESTO.id:
                    canteenId = Canteens.PASTO_LESTO.id;
                    break;
                case Canteens.POVO_0.id:
                    canteenId = Canteens.POVO_0.id;
                    break;
                case Canteens.POVO_1.id:
                    canteenId = Canteens.POVO_1.id;
                    break;
                default:
                    // At this point canteenId will be equal to null
            }

            if(canteenId === null) {
                error = new Error(HttpStatus.BAD_REQUEST, ErrorType.CANTEEN_ERROR);
                reject(error);
            } else {
                waitingTimeWeeklyAttributes = new WaitingTimeWeeklyAttributes(canteenId);
                resolve(waitingTimeWeeklyAttributes);
            }
        }   
        
        return new Promise(promiseFunction);
    }
        
}