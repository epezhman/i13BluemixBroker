const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');
const parallel = require('async/parallel');


/**
 * 1.   Get subscribed messages of an app
 *
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.stateless           If stateless
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
            let messages = null;
            if (params.stateless && params.stateless === "true") {
                messages = cloudant.db.use('published_messages_bc');
            }
            else {
                messages = cloudant.db.use('published_messages');
            }
            const ows = openwhisk();

            parallel({
                    timestamp: (callback) => {
                        let getLast = getLastRead(cloudant, params.subscriber_id);
                        getLast.then(result => {
                                console.log('[get-subscribed-messages.main] success: got the last subscribed timestamp');
                                callback(null, result['result']);
                            }
                        ).catch(err => {
                                console.log('[get-subscribed-messages.main] error: could NOT get last subscribed timestamp');
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
                                console.log('[get-subscribed-messages.main] error: could NOT get subscribed topics');
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
                    if (results['topics'] && results['topics'].length) {
                        messages.find({
                            "selector": {
                                "timestamp": {"$gt": results['timestamp']},
                                "topic": {"$in": results['topics']}
                            },
                            "fields": [
                                "topic",
                                "message",
                                "time"
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
                    }
                    else {
                        console.log('[get-subscribed-messages.main] success: No Topics');
                        return resolve([])
                    }
                });
        });
    }
    return {message: "Subscriber Id is missing"};
}

function getLastRead(cloudant, subscriber_id) {
    return new Promise((resolve, reject) => {

        const sub_logs = cloudant.db.use('subscribers_logs');
        sub_logs.get(subscriber_id, {revs_info: true}, (err, data) => {
            const time = new Date();
            const timestamp = Date.now();
            if (err) {
                sub_logs.insert({
                    _id: subscriber_id,
                    time: time,
                    timestamp: timestamp
                }, (err, body, head) => {
                    if (err) {
                        console.log('[get-subscribed-messages.get-last-read] error: error insert subscriber first time');
                        console.log(err);
                        reject({
                            result: 'Error occurred inserting the subscriber for first time.'
                        });
                    }
                    else {
                        console.log('[get-subscribed-messages.get-last-read] success: success insert subscriber first time');
                        resolve({
                            result: 0
                        });
                    }
                });
            }
            else {
                let old_timestamp = data.timestamp;
                sub_logs.insert({
                    _id: data._id,
                    _rev: data._rev,
                    time: time,
                    timestamp: timestamp
                }, (err, body, head) => {
                    if (err) {
                        console.log('[get-subscribed-messages.get-last-read] error: error updating subscriber log');
                        console.log(err);
                        reject({
                            result: 'Error occurred updating the subscriber log.'
                        });
                    }
                    else {
                        console.log('[get-subscribed-messages.get-last-read] success: success updating subscriber log');
                        resolve({
                            result: old_timestamp
                        });
                    }
                });
            }
        });
    });
}
