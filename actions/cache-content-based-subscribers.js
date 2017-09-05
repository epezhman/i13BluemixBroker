const openwhisk = require('openwhisk');

let subscribers = {};
let last_checked_subscribers_contents = {};
const stale_time_ms = 1000;

/**
 * 1.   It receives a message and its topics from the publisher and submits them to the Cloudant
 *
 * @param   params.contents                     The topic of the message
 * @param   params.message                      The body of the published message
 * @param   params.time                         The message time
 * @param   params.subscriber_id                The subscriber ID
 * @param   params.CLOUDANT_USERNAME            Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD            Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        if (!last_checked_subscribers_contents.hasOwnProperty(params.subscriber_id)) {
            last_checked_subscribers_contents[params.subscriber_id] = Date.now();
        }
        if (subscribers.hasOwnProperty(params.subscriber_id) &&
            Date.now() - last_checked_subscribers_contents[params.subscriber_id] < stale_time_ms) {
            if (subscribers[params.subscriber_id].length) {
                forwardPublications(params, Date.now(), resolve, reject)
            }
        }
        else {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribers_db = cloudant.db.use('subscribers');
            subscribers_db.get(params.subscriber_id, (err, result) => {
                if (!err) {
                    console.log('[cache-content-based-subscribers.main] success: got the subscribed topics');
                    last_checked_subscribers_contents[params.subscriber_id] = Date.now();
                    subscribers[params.subscriber_id] = result.hasOwnProperty('predicates') ? result['predicates'] : [];
                    if (subscribers[params.subscriber_id].length) {
                        forwardPublications(params, Date.now(), resolve, reject)
                    }
                }
                else {
                    console.log('[cache-content-based-subscribers.main] error: cloud not get the subscribed topics');
                }
            });
        }
    });
}

function forwardPublications(params, time, resolve, reject) {
    const ows = openwhisk();
    ows.actions.invoke({
        name: "pubsub/preform_content_based_matching_forward_message",
        params: {
            contents: params.contents,
            message: params.message,
            time: time,
            predicates: subscribers[params.subscriber_id],
            subscriber_id: params.subscriber_id
        }
    }).then(result => {
            console.log('[cache-content-based-subscribers.forwardPublications] success: forwarded to watson action');
            resolve({
                result: "Success: publication forwarded for matching."
            })
        }
    ).catch(err => {
            console.log('[cache-content-based-subscribers.forwardPublications] error: could NOT forward the topic watson action');
            console.log(err);
            reject({
                result: "Error happened with publications"
            })
        }
    );
}