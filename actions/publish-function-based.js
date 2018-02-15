const each = require('async/each');
const openwhisk = require('openwhisk');
const Cloudant = require('cloudant');

let subscribers = {};
let last_checked_sub_types = {};
const stale_time_ms = 1000;

/**
 * 1.   It receives a message and its topics from the publisher and forwards to the next action
 *
 * @param   params.sub_type              The topics of the message
 * @param   params.message             The body of the published message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        if (!last_checked_sub_types.hasOwnProperty(params.sub_type)) {
            last_checked_sub_types[params.sub_type] = Date.now();
        }
        if (subscribers.hasOwnProperty(params.sub_type) &&
            Date.now() - last_checked_sub_types[params.sub_type] < stale_time_ms) {
            forwardPublicationForMatching(params.sub_type, params.message, Date.now(), resolve, reject)
        }
        else {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribed_method_types = cloudant.db.use('subscribed_method_types');
            subscribed_method_types.get(params.topic, (err, result) => {
                if (!err) {
                    console.log('[publish-function-based.main] success: got the subscribed types');
                    subscribed_method_types[params.sub_type] = Date.now();
                    subscribers[params.sub_type] = result['subscribers'];
                    forwardPublicationForMatching(params.sub_type, params.message, Date.now(), resolve, reject)
                }
                else {
                    console.log('[publish-function-based.main] error: could not get the subscribed types');
                }
            });
        }
    });
}

function forwardPublicationForMatching(sub_type, message, time, resolve, reject) {
    const ows = openwhisk();
    each(subscribers[sub_type], function (sub_id, callback) {
        ows.actions.invoke({
            name: "pubsub/forward_publication",
            params: {
                sub_type: sub_type,
                message: message,
                time: time,
                subscriber_id: sub_id
            }
        }).then(result => {
                console.log('[publish-function-based.forwardPublicationForMatching] success: forwarded the publication for matching.');
                callback();
            }
        ).catch(err => {
                console.log('[publish-function-based.forwardPublicationForMatching] error: could NOT forward the publications for matching.');
                callback(err);
            }
        );
    }, function (err) {
        if (err) {
            console.log('[publish-function-based.forwardPublicationForMatching] error: Error in forwarding the publications for matching');
            console.log(err);
            reject({
                result: 'Error occurred forwarding the messages.'
            });

        } else {
            console.log('[publish-function-based.forwardPublicationForMatching] success: Successfully forwarded for matching.');
            resolve({
                result: 'Success. Function Message Forwarded for Matching.'
            });
        }
    });
}
