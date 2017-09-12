const Cloudant = require('cloudant');
const eachSeries = require('async/eachSeries');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.topics              Topics to subscribe
 * @param   params.subscribers       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Standard OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        try {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribed_topics = cloudant.db.use('subscribed_topics');
            const subscribers = cloudant.db.use('subscribers');

            let subs = params.subscribes.split(',');
            let topics = params.topics.split(',');

            eachSeries(topics, (topic, pcb) => {
                topic = topic.trim();
                if (topic.length) {
                    subscribed_topics.get(topic, {revs_info: true}, (err, data) => {
                        if (err) {
                            subscribed_topics.insert({
                                _id: topic,
                                topic: topic,
                                subscribers: subs
                            }, (err, body, head) => {
                                if (err) {
                                    console.log('[bulk-subscribe.main] error: error insert subscriber first time');
                                    console.log(err);
                                    setTimeout(pcb, 25);
                                }
                                else {
                                    setTimeout(pcb, 25);
                                }
                            });
                        }
                        else {
                            data.subscribers = subs;
                            subscribed_topics.insert(data, (err, body, head) => {
                                if (err) {
                                    console.log('[bulk-subscribe.main] error: appending subscriber first time');
                                    console.log(err);
                                    setTimeout(pcb, 25);
                                }
                                else {
                                    setTimeout(pcb, 25);
                                }
                            });
                        }
                    });
                }
            }, (err) => {
                if (err) {
                    console.log('[bulk-subscribe.main] error: subscription not inserted');
                    console.log(err);
                    reject({
                        result: 'Error occurred inserting the subscriptions.'
                    });
                } else {
                    console.log('[bulk-subscribe.main] success: subscription insert');

                    eachSeries(subs, (sub_id, ecb) => {
                        subscribers.get(sub_id, {revs_info: true}, (err, data) => {
                            if (!err) {
                                data.topics = topics;
                                subscribers.insert(data, (err, body, head) => {
                                    if (err) {
                                        console.log('[bulk-subscribe.main] error: could not add the predicates to subscribers.');
                                        console.log(err);
                                        setTimeout(ecb, 25);
                                    }
                                    else {
                                        console.log('[bulk-subscribe.main] success: added the predicates to the subscribers.');
                                        setTimeout(ecb, 25);
                                    }
                                });
                            }
                            else {
                                console.log('[bulk-subscribe.main] error: did not find the subscriber.');
                                console.log(err);
                                setTimeout(ecb, 25);
                            }
                        });
                    }, (err) => {
                        if (err) {
                            console.log('[bulk-subscribe.main] error: subscription not inserted');
                            console.log(err);
                            reject({
                                result: 'Error occurred inserting the subscriptions.'
                            });
                        } else {
                            console.log('[bulk-subscribe.main] success: subscription insert');
                            resolve({
                                result: 'Success. Subscriptions inserted.'
                            });
                        }
                    });
                }
            });
        }
        catch (err) {
            console.log(err);
            reject({
                result: 'Some Error'
            });
        }
    });
}
