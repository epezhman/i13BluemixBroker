const Cloudant = require('cloudant');

/**
 * 1.   Get subscribed topics of an app
 *
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const cloudant = new Cloudant({
            account: params.CLOUDANT_USERNAME,
            password: params.CLOUDANT_PASSWORD
        });
        const subscribers = cloudant.db.use('subscribers');
        subscribers.get(params.subscriber_id, (err, result) => {
            if (!err) {
                console.log('[get-subscribed-topics.main] success: got the subscribed topics');
                if (result.hasOwnProperty('topics'))
                    return resolve({topics: result['topics']});
                else
                    return resolve({topics: []});
            }
            else {
                console.log('[get-subscribed-topics.main] error: Error in getting the subscribed topics');
                console.log(err);
                return reject({
                    result: 'Error in query the subscribed topics'
                });
            }
        });
    });
}
