var MeasureEntity = require('../entities/MeasureEntity.js');
var mysql = require('mysql');

module.exports = class MeasureDBHelper {
    
    constructor() {
        this.pool = mysql.createPool({
            //connectionLimit: 
            host: "nanobit.eu",
            user: "mluser",
            password: "sfHEROWIFJ45EFH8fj38spL937234SDF9$@AkwpcuFoH4DFHjfDSD3432BZ",
            database: "uneatn_sandbox"
        });
    }
    
    // Add a new entry in measures 
    addMeasure(measure) {
        var promiseFunction = function(reject) {
            // Method to insert measure in uneatn database not in that created for ml
            var sql = "INSERT INTO measures (telegram_id, canteen_id, arrive_time, wait_seconds) VALUES ?";
            var values = [measure.telegramId, measure.canteenId, measure.arriveTime, measure.waitSeconds];

            this.pool.getConnection(function(err, connection) {
                if(err) reject(err);
                // Use the connection
                connection.query(sql, [values], function(err, result) {
                    measure.measureId = result.insertId;

                    // Done with the connetion
                    connection.release();

                    // Handle error after the release
                    if(err) reject(err);
                    
                });
            });
        }
        
        return new Promise(promiseFunction);
        
    }
}