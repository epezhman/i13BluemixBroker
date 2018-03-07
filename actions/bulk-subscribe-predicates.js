const eachOfSeries = require('async/eachOfSeries');
const eachSeries = require('async/eachSeries');
const Cloudant = require('cloudant');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.predicates          Predicates to subscribe
 * @param   params.subscribes         Subscriber  ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        try {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribed_predicates = cloudant.db.use('subscribed_predicates');
            const subscribers = cloudant.db.use('subscribers');

            let predicates = JSON.parse(params.predicates);
            let subs = params.subscribes.split(',');

            eachOfSeries(predicates, (predicateContent, predicate, pcb) => {
                let predicateLower = predicate.toLowerCase();
                subscribed_predicates.get(predicateLower, {revs_info: true}, (err, data) => {
                    if (err) {
                        let temp_subs = [];
                        for (let i = 0; i < subs.length; i++) {
                            temp_subs.push({
                                subscriber_id: subs[i],
                                predicates: predicates
                            });
                        }
                        subscribed_predicates.insert({
                            _id: predicateLower,
                            subject: predicateLower,
                            subscribers: temp_subs
                        }, (err, body, head) => {
                            if (err) {
                                console.log('[bulk-subscribe-predicates.main] error: subscriber NOT added to predicate for first time.');
                                console.log(err);
                                setTimeout(pcb, 25);
                            } else {
                                console.log('[bulk-subscribe-predicates.main] success: subscriber add to predicate for first time.');
                                setTimeout(pcb, 25);
                            }
                        });
                    }
                    else {
                        let temp_subs = [];
                        for (let i = 0; i < subs.length; i++) {
                            temp_subs.push({
                                subscriber_id: subs[i],
                                predicates: predicates
                            });
                        }
                        data.subscribers = temp_subs;
                        subscribed_predicates.insert(data, (err, body, head) => {
                            if (err) {
                                console.log('[bulk-subscribe-predicates.main] error: subscriber NOT added to predicate.');
                                console.log(err);
                                setTimeout(pcb, 25);
                            } else {
                                console.log('[bulk-subscribe-predicates.main] success: subscriber add to predicate.');
                                setTimeout(pcb, 25);
                            }
                        });
                    }
                });

            }, (err) => {
                if (err) {
                    console.log('[bulk-subscribe-predicates.main] error: subscription not inserted');
                    console.log(err);
                    reject({
                        result: 'Error occurred inserting the subscriptions.'
                    });
                } else {
                    console.log('[bulk-subscribe-predicates.main] success: subscription insert');
                    eachSeries(subs, (sub_id, ecb) => {
                        subscribers.get(sub_id, {revs_info: true}, (err, data) => {
                            if (!err) {
                                data.predicates = predicates;
                                subscribers.insert(data, (err, body, head) => {
                                    if (err) {
                                        console.log('[bulk-subscribe-predicates.main] error: could not add the predicates to subscribers.');
                                        console.log(err);
                                        setTimeout(ecb, 25);
                                    }
                                    else {
                                        console.log('[bulk-subscribe-predicates.main] success: added the predicates to the subscribers.');
                                        setTimeout(ecb, 25);
                                    }
                                });
                            }
                            else {
                                console.log('[bulk-subscribe-predicates.main] error: did not find the subscriber.');
                                console.log(err);
                                setTimeout(ecb, 25);
                            }
                        });

                    }, (err) => {
                        if (err) {
                            console.log('[bulk-subscribe-predicates.main] error: subscription not inserted');
                            console.log(err);
                            reject({
                                result: 'Error occurred inserting the subscriptions.'
                            });
                        } else {
                            console.log('[bulk-subscribe-predicates.main] success: subscription insert');
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