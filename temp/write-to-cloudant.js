var request = require('request');
var Cloudant = require('cloudant');

var LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/512px-IBM_logo.svg.png";
var CONTENT_TYPE = "image/png";
var IMAGE_NAME_PREFIX = "IBM_logo";
var IMAGE_NAME_POSTFIX = ".png";

/**
 * This action downloads an IBM logo, and returns an object to be written to a cloudant database.
 * This action is idempotent. If it fails, it can be retried.
 *
 * @param   params.CLOUDANT_USERNAME               Cloudant username
 * @param   params.CLOUDANT_PASSWORD               Cloudant password
 * @param   params.CLOUDANT_DATABASE               Cloudant database to store the file to
 * @return  Promise for the downloaded image object
 */
function main(params) {

    // Configure database connection
    var cloudant = new Cloudant({
        account: params.CLOUDANT_USERNAME,
        password: params.CLOUDANT_PASSWORD
    });
    var database = cloudant.db.use(params.CLOUDANT_DATABASE);

    // Generate a random name to trigger the database change feed
    var imageName = IMAGE_NAME_PREFIX + getRandomInt(1, 100000) + IMAGE_NAME_POSTFIX;

    return new Promise(function(resolve, reject) {
        request({
            uri: LOGO_URL,
            method: 'GET',
            encoding: null
        }, function(err, response, body) {
            if (err) {
                reject();

            } else {

                database.multipart.insert({
                        _id: imageName
                    }, [{
                        name: imageName,
                        data: body,
                        content_type: CONTENT_TYPE
                    }],
                    imageName,
                    function(err, body) {
                        if (err && err.statusCode != 409) {
                            console.log("Error with file insert." + err);
                            reject();
                        } else {
                            console.log("Success with file insert.");
                            resolve();
                        }
                    }
                );

            }
        });
    });

}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}