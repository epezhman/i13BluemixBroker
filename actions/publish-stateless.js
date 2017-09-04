const Cloudant = require('cloudant');
const each = require('async/each');
const eachLimit = require('async/eachLimit');
const requestPromise = require('request-promise');

/**
 * 1.   It receives a message and its topics from the publisher and submits them to the Cloudant
 *
 * @param   params.topics              The topics of the message
 * @param   params.message             The body of the published message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @param   params.WATSON_IOT_ORG                Watson IoT Org (set once at action update time)
 * @param   params.WATSON_IOT_APPLICATION_TYPE   Watson IoT Application Type (set once at action update time)
 * @param   params.WATSON_IOT_API_USERNAME       Watson IoT Username (set once at action update time)
 * @param   params.WATSON_IOT_API_PASSWORD       Watson IoT Password(set once at action update time)
 * @return                             Standard OpenWhisk success/error response
 */

let subscribers = {};

function main(params) {
    if (params.hasOwnProperty('topics') && params.hasOwnProperty('message')) {
        return new Promise((resolve, reject) => {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });

            const subscribed_topics = cloudant.db.use('subscribed_topics');
            eachLimit(params.topics.split(','),100, (topic, mcb) => {
                topic = topic.trim();
                if (topic.length) {
                    if (subscribers.hasOwnProperty(topic)) {
                        forwardPublications(params.message, topic, Date.now(), params, mcb)
                    }
                    else {
                        subscribed_topics.get(topic, (err, result) => {
                            if (!err) {
                                console.log('[publish-stateless.main] success: got the subscribed topics');
                                subscribers[topic] = result['subscribers'];
                                forwardPublications(params.message, topic, Date.now(), params, mcb)
                            }
                            else {
                                console.log('[publish-stateless.main] error: cloud not get the subscribed topics');
                                mcb(err);
                            }
                        });
                    }
                }
            }, (err) => {
                if (err) {
                    console.log('[publish-stateless.main] error: message not published ');
                    console.log(err);
                    reject({
                        result: 'Error occurred publishing the message.'
                    });
                } else {
                    console.log('[publish-stateless.main] success: message published');
                    resolve({
                        result: 'Success. Message Published.'
                    });
                }
            });
        });
    }
    return {message: "Either message or topics are not provided"};
}

function forwardPublications(message, topic, time, params, mcb) {
    each(subscribers[topic], function (sub_id, callback) {
        let subscriber_url = `http://${params.WATSON_IOT_ORG}.messaging.internetofthings.ibmcloud.com:1883/api/v0002/application/types/${params.WATSON_IOT_APPLICATION_TYPE}/devices/${sub_id}/commands/published_message`;
        let req_options = {
            uri: subscriber_url,
            method: 'POST',
            body: {
                message: message,
                topic: topic,
                time: time
            },
            auth: {
                'username': params.WATSON_IOT_API_USERNAME,
                'password': params.WATSON_IOT_API_PASSWORD
            },
            json: true
        };
        requestPromise(req_options)
            .then(function (parsedBody) {
                callback()
            })
            .catch(function (err) {
                console.log(`[publish-stateless.forwardPublications] error: Message could not be sent to ${sub_id}`);
                callback()
            });

    }, function (err) {
        if (err) {
            console.log('[publish-stateless.forwardPublications] error: Error in sending the message to subscribers');
            console.log(err);
            mcb(err);

        } else {
            console.log('[publish-stateless.forwardPublications] success: Successfully sent messages to subscribers');
            mcb();
        }
    });
}
