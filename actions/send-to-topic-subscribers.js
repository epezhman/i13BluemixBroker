const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');
const each = require('async/each');

let subscribers = {};
let last_checked_topics = {};

const stale_time_ms = 1000;

/**
 * 1.   Get subscribed messages of an app
 *
 * @param   params.topic         Publication topic
 * @param   params.message       publication message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             {message: string} OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const cloudant = new Cloudant({
            account: params.CLOUDANT_USERNAME,
            password: params.CLOUDANT_PASSWORD
        });

        const subscribed_topics = cloudant.db.use('subscribed_topics');
        if (!last_checked_topics.hasOwnProperty(params.topic)) {
            last_checked_topics[params.topic] = Date.now();
        }

        if (subscribers.hasOwnProperty(params.topic) && Date.now() - last_checked_topics[params.topic] < 1000) {
            forwardPublications(params.topic, params.message, Date.now(), resolve, reject)
        }
        else {
            subscribed_topics.get(params.topic, (err, result) => {
                if (!err) {
                    console.log('[get-subscribed-messages.main] success: got the subscribed topics');
                    last_checked_topics[params.topic] = Date.now();
                    subscribers[params.topic] = result['subscribers'];
                    forwardPublications(params.topic, params.message, Date.now(), resolve, reject)
                }
                else {
                    console.log('[get-subscribed-messages.main] error: cloud not get the subscribed topics');
                }
            });
        }
    });
}


function forwardPublications(topic, message, time, resolve, reject) {
    const ows = openwhisk();
    each(subscribers[topic], function (sub_id, callback) {
        ows.actions.invoke({
            name: "pubsub/forward_publication",
            params: {
                topic: topic,
                message: message,
                time: time,
                subscriber_id: sub_id
            }
        }).then(result => {
                console.log('[get-subscribed-messages.forwardPublications] success: forwarded to watson action');
                callback();
            }
        ).catch(err => {
                console.log('[get-subscribed-messages.forwardPublications] error: could NOT forward the topic watson action');
                callback(err);
            }
        );
    }, function (err) {
        if (err) {
            console.log('[get-subscribed-messages.forwardPublications] error: Error in forwarding the publications');
            console.log(err);
            reject({
                result: 'Error occurred forwarding the messages.'
            });

        } else {
            console.log('[get-subscribed-messages.forwardPublications] success: Successfully forwarded');
            resolve({
                result: 'Success. Message Forwarded.'
            });
        }
    });
}


