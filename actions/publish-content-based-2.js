const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');
const each = require('async/each');

let subscribers = {};
let last_checked_contents = {};
const stale_time_ms = 10000;

/**
 * 1.   Get subscribed messages of an app
 *
 * @param   params.first_predicate     First published predicate
 * @param   params.predicates            Publication's predicates
 * @param   params.message             Publication message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        if (!last_checked_contents.hasOwnProperty(params.first_predicate)) {
            last_checked_contents[params.first_predicate] = Date.now();
        }
        if (subscribers.hasOwnProperty(params.first_predicate) &&
            Date.now() - last_checked_contents[params.first_predicate] < stale_time_ms) {
            forwardPublications(params, Date.now(), resolve, reject)
        }
        else {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribed_predicates = cloudant.db.use('subscribed_predicates');
            subscribed_predicates.get(params.first_predicate, (err, result) => {
                if (!err) {
                    console.log('[publish-content-based-2.main] success: got the subscribed predicates');
                    last_checked_contents[params.first_predicate] = Date.now();
                    subscribers[params.first_predicate] = result['subscribers'];
                    forwardPublications(params, Date.now(), resolve, reject)
                }
                else {
                    console.log('[publish-content-based-2.main] error: could not get the subscribed predicates');
                }
            });
        }
    });
}

function forwardPublications(params, time, resolve, reject) {
    const ows = openwhisk();
    each(subscribers[params.first_predicate], function (sub_info, callback) {
        ows.actions.invoke({
            name: "pubsub/publish_content_based_3",
            params: {
                predicates: params.predicates,
                message: params.message,
                time: time,
                subscriber_id: sub_info['subscriber_id'],
                subscriber_predicates: sub_info['predicates']
            }
        }).then(result => {
            console.log('[publish-content-based-2.forwardPublications] success: forwarded to watson action');
            callback();
        }).catch(err => {
            console.log('[publish-content-based-2.forwardPublications] error: could NOT forward the topic watson action');
            callback();
        });
    }, function (err) {
        if (err) {
            console.log('[publish-content-based-2.forwardPublications] error: Error in forwarding the publications');
            console.log(err);
            reject({
                result: 'Error occurred forwarding the messages.'
            });

        } else {
            console.log('[publish-content-based-2.forwardPublications] success: Successfully forwarded');
            resolve({
                result: 'Success. Message Forwarded.'
            });
        }
    });
}