const Cloudant = require('cloudant');
const eachSeries = require('async/eachSeries');
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
        const subscribed_predicates = cloudant.db.use('subscribed_predicates');
        eachSeries(params.predicates, (predicate, mcb) => {
            if (params.predicates.hasOwnProperty(predicate)) {
                subscribed_predicates.get(predicate, {revs_info: true}, (err, data) => {
                    if (!err) {
                        subscribed_predicates.insert({
                            _id: data._id,
                            _rev: data._rev,
                            subscribers: array.remove(data.subscribers, function (_sub_id) {
                                return _sub_id !== params.subscriber_id
                            })
                        }, (err, body, head) => {
                            if (err) {
                                console.log(err);
                                mcb('[unsubscribe-predicates.main] error: removing subscriber from topics list')
                            }
                            else {
                               mcb();
                            }
                        });
                    }
                    else {
                        mcb();
                    }
                });
            }
        }, (err) => {
            if (err) {
                console.log('[unsubscribe-predicates.main] error: subscription not deleted');
                console.log(err);
                reject({
                    result: 'Error occurred deleting the subscriptions.'
                });
            } else {
                console.log('[unsubscribe-predicates.main] success: subscription deleted');
                const subscribers = cloudant.db.use('subscribers');
                subscribers.get(params.subscriber_id, {revs_info: true}, (err, data) => {
                    if (!err) {
                        subscribers.insert({
                            _id: data._id,
                            _rev: data._rev,
                            predicates: [],
                            topics: data.hasOwnProperty('topics') ? data.topics : [],
                            time: data.time,
                            timestamp: data.timestamp
                        }, (err, body, head) => {
                            if (err) {
                                console.log('[unsubscribe.main] error: removing predicates from subscriber list');
                                console.log(err);
                                reject({
                                    result: 'Error occurred deleting predicates from subscriber.'
                                });
                            }
                            else {
                                console.log('[unsubscribe.main] error: Predicated successfully removed');
                                resolve({
                                    result: 'Success. Predicates successfully deleted.'
                                });
                            }
                        });
                    }
                    else {
                        console.log('[unsubscribe.main] error: subscriber does not exist');
                        reject({
                            result: 'Error subscriber does not exit.'
                        });
                    }
                });
            }
        });
    });
}