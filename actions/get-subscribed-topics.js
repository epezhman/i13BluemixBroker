const Cloudant = require('cloudant');

/**
 * 1.   Get subscribed topics of an app
 *
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             {message: string} OpenWhisk success/error response
 */

function main(params) {
    if (params.hasOwnProperty('subscriber_id')) {
        return new Promise((resolve, reject) => {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribed_topics = cloudant.db.use('subscribed_topics');

            subscribed_topics.find({
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
                    console.log('[get-subscribed-topics.main] success: got the subscribed topics');
                    let topics = [];
                    if (result.docs) {
                        result.docs.forEach((topic) => {
                            topics.push(topic.topic)
                        });
                    }
                    return resolve({topics: topics});
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
    return {message: "Subscriber Id is missing"};
}
