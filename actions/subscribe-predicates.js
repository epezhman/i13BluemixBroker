const Cloudant = require('cloudant');
const eachSeries = require('async/eachSeries');
const openwhisk = require('openwhisk');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.predicates          Predicates to subscribe
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
        const ows = openwhisk();
        let predicates = JSON.parse(params.predicates);
        console.log(predicates)
        resolve({
            result: 'Success. Predicates successfully deleted.'
        });
        ows.actions.invoke({
            name: "pubsub/unsubscribe_predicates",
            blocking: true,
            result: true,
            params: {
                subscriber_id: params.subscriber_id,
                predicates: predicates
            }
        }).then(result => {
                console.log('[subscribe-predicates.main] success: All subscribed predicates');
                resolve({
                    result: 'Success. Predicates successfully deleted.'
                });
                //addSubscriberToPredicates(cloudant, params, predicates, resolve, reject);
            }
        ).catch(err => {
                console.log('[subscribe-predicates.main] error: could NOT remove the predicates');
                resolve({
                    result: 'Error. could remove insert the subscription..'
                });
            }
        );
    });
}

function addSubscriberToPredicates(cloudant, params, predicates, resolve, reject) {
    const subscribed_predicates = cloudant.db.use('subscribed_predicates');
    eachSeries(predicates, (predicate, mcb) => {
        if (predicates.hasOwnProperty(predicate)) {
            subscribed_predicates.get(predicate, {revs_info: true}, (err, data) => {
                if (err) {
                    subscribed_predicates.insert({
                        _id: predicate,
                        subject: predicate,
                        subscribers: [params.subscriber_id]
                    }, (err, body, head) => {
                        if (err) {
                            console.log(err);
                            mcb('[subscribe-predicates.addSubscriberToPredicates] error: error insert subscriber first time')
                        }
                        else {
                            addPredicatesToSubscriber(cloudant, predicates[predicate],
                                params.subscriber_id, mcb);
                        }
                    });
                }
                else {
                    subscribed_predicates.insert({
                        _id: data._id,
                        _rev: data._rev,
                        subscribers: array.union(data.subscribers, [params.subscriber_id])
                    }, (err, body, head) => {
                        if (err) {
                            console.log(err);
                            mcb('[subscribe-predicates.addSubscriberToPredicates] error: appending subscriber first time')
                        }
                        else {
                            addPredicatesToSubscriber(cloudant, predicates[predicate],
                                params.subscriber_id, mcb);
                        }
                    });
                }
            });
        }
    }, (err) => {
        if (err) {
            console.log('[subscribe.addSubscriberToPredicates] error: subscription not inserted');
            console.log(err);
            reject({
                result: 'Error occurred inserting the subscriptions.'
            });
        } else {
            console.log('[subscribe.addSubscriberToPredicates] success: subscription insert');
            resolve({
                result: 'Success. Subscriptions inserted.'
            });
        }
    });
}

function addPredicatesToSubscriber(cloudant, predicate, subscriber_id, mcb) {
    const subscribers = cloudant.db.use('subscribers');
    subscribers.get(subscriber_id, {revs_info: true}, (err, data) => {
        if (!err) {
            subscribers.insert({
                _id: data._id,
                _rev: data._rev,
                predicates: data.hasOwnProperty('predicates') ? array.union(data.predicates, [predicate]) : [predicate],
                topics: data.hasOwnProperty('topics') ? data.topics : [],
                time: data.time,
                timestamp: data.timestamp
            }, (err, body, head) => {
                if (err) {
                    console.log(err);
                    mcb('[subscribe-predicates.addPredicatesToSubscriber] error: appending topics to subscribers list')
                }
                else {
                    mcb()
                }
            });
        }
        else {
            mcb('[subscribe-predicates.addPredicatesToSubscriber] error: subscriber does not exist')
        }
    });
}