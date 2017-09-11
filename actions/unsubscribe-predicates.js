const Cloudant = require('cloudant');
const eachOf = require('async/eachOf');
const openwhisk = require('openwhisk');

/**
 * 1.   For subscribing to multiple topics at once
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
        const ows = openwhisk();
        subscribers.get(params.subscriber_id, {revs_info: true}, (err, data) => {
            if (!err) {
                eachOf(data.predicates, (predicateContent, predicate, pcb) => {
                    ows.actions.invoke({
                        name: "pubsub/remove_subscribers_from_predicates",
                        blocking: true,
                        result: true,
                        params: {
                            subscriber_id: params.subscriber_id,
                            predicate: predicate
                        }
                    }).then(result => {
                        pcb();
                    }).catch(err => {
                        pcb();
                    });
                }, (err) => {
                    if (err) {
                        console.log('[unsubscribe-predicates.main] error: subscription not removed');
                        console.log(err);
                        reject({
                            result: 'Error occurred removing the subscribers.'
                        });
                    } else {
                        console.log('[unsubscribe-predicates.main] success: subscription removed');
                        data.predicates = [];
                        subscribers.insert(data, (err, body, head) => {
                            if (err) {
                                console.log('[unsubscribe-predicates.main] error: removing predicates from subscriber list');
                                console.log(err);
                                reject({
                                    result: 'Error occurred deleting predicates from subscriber.'
                                });
                            }
                            else {
                                console.log('[unsubscribe-predicates.main] success: Predicated successfully removed');
                                resolve({
                                    result: 'Success. Predicates successfully deleted.'
                                });
                            }
                        });
                    }
                });
            }
            else {
                console.log('[unsubscribe-predicates.main] error: subscriber does not exist');
                reject({
                    result: 'Error subscriber does not exit.'
                });
            }
        });
    });
}