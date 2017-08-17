const Cloudant = require('cloudant');
const each = require('async/each');


/**
 * 1.   Get subscribed topics of an app
 *
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             {message: string} OpenWhisk success/error response
 */

function main(params) {
    if (params.subscriber_id) {
        return new Promise((resolve, reject) => {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribers = cloudant.db.use('subscribers');

            subscribers.find({
                "selector": {
                    "subscriber": params.subscriber_id
                },
                "fields": [
                    "topic"
                ],
                "sort": [
                    {
                        "topic:string": "asc"
                    }
                ]
            }, (err, result) => {
                if (!err) {
                    resolve(result);
                }
                else {
                    console.log(err);
                    reject({
                        result: 'Error in query the subscription'
                    });
                }
            });
        });
    }
    return {message: "Subscriber Id is missing"};
}
