const eachOf = require('async/eachOf');
const openwhisk = require('openwhisk');

/**
 * 1.   For subscribing to multiple subscriptions at once
 *
 * @param   params.predicates          Predicates to subscribe
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const ows = openwhisk();
        let predicates = JSON.parse(params.predicates);
        ows.actions.invoke({
            name: "pubsub/unsubscribe_predicates",
            blocking: true,
            result: true,
            params: {
                subscriber_id: params.subscriber_id,
                predicates: predicates
            }
        }).then(result => {
                console.log('[subscribe-predicates.main] success: All subscribed predicates removed');
                ows.actions.invoke({
                    name: "pubsub/subscribe_predicates_add_predicates_to_subscribers",
                    params: {
                        subscriber_id: params.subscriber_id,
                        predicates: predicates
                    }
                });
                eachOf(predicates, (predicateContent, predicate, pcb) => {
                    ows.actions.invoke({
                        name: "pubsub/subscribe_predicates_add_subscribers_to_predicates",
                        params: {
                            subscriber_id: params.subscriber_id,
                            predicate: predicate.toLowerCase()
                        }
                    }).then(result => {
                        pcb();
                    }).catch(err => {
                        pcb();
                    });
                }, (err) => {
                    if (err) {
                        console.log('[subscribe-predicates.main] error: subscription not inserted');
                        console.log(err);
                        reject({
                            result: 'Error occurred inserting the subscriptions.'
                        });
                    } else {
                        console.log('[subscribe-predicates.main] success: subscription insert');
                        resolve({
                            result: 'Success. Subscriptions inserted.'
                        });
                    }
                });
            }
        ).catch(err => {
                console.log('[subscribe-predicates.main] error: could NOT remove the predicates');
                reject({
                    result: 'Error. could remove insert the subscription..'
                });
            }
        );
    });
}