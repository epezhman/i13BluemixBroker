const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');
const parallel = require('async/parallel');


/**
 * 1.   Get subscribed messages of an app
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
            const messages = cloudant.db.use('published_messages');
            const ows = openwhisk();

            parallel({
                    timestamp: (callback) => {
                        ows.actions.invoke({
                            name: "pubsub/last_read",
                            blocking: true,
                            result: true,
                            params: {
                                subscriber_id: params.subscriber_id
                            }
                        }).then(result => {
                                console.log('[get-subscribed-messages.main] success: got the last subscribed timestamp');
                                callback(null, result.response.result.result);
                            }
                        ).catch(err => {
                                console.log('[get-subscribed-messages.main] err: could NOT get last subscribed timestamp');
                                callback(err);
                            }
                        );
                    },
                    topics: (callback) => {
                        ows.actions.invoke({
                            name: "pubsub/get_sub_topics",
                            blocking: true,
                            result: true,
                            params: {
                                subscriber_id: params.subscriber_id
                            }
                        }).then(result => {
                                console.log('[get-subscribed-messages.main] success: got the subscribed topics');
                                callback(null, result.response.result.topics);
                            }
                        ).catch(err => {
                                console.log('[get-subscribed-messages.main] err: could NOT get subscribed topics');
                                callback(err);
                            }
                        );
                    }
                },
                (err, results) => {
                    if (err) {
                        console.log('[get-subscribed-messages.main] error: Error in getting topics or timestamp');
                        console.log(err);
                        return reject({
                            error: 'Error in getting topics or timestamp'
                        });
                    }
                    messages.find({
                        "selector": {
                            "timestamp": {"$gt": results['timestamp']},
                            "topic": {"$in": results['topics']}
                        },
                        "fields": [
                            "topic",
                            "message",
                            "timestamp"
                        ],
                        "sort": [
                            {
                                "timestamp:number": "desc"
                            }
                        ]
                    }, (err, result) => {
                        if (!err) {
                            console.log('[get-subscribed-messages.main] success: got the subscribed messages');
                            return resolve(result);
                        }
                        else {
                            console.log('[get-subscribed-messages.main] error: Error in getting the subscribed messages');
                            console.log(err);
                            return reject({
                                error: 'Error in query the subscribed messages'
                            });
                        }
                    });
                });
        });
    }
    return {message: "Subscriber Id is missing"};
}
