const each = require('async/each');
const openwhisk = require('openwhisk');

/**
 * 1.   It receives a message and its topics from the publisher and forwards to the next action
 *
 * @param   params.topics              The topics of the message
 * @param   params.message             The body of the published message
 * @param   params.polling_supported   If messages should be backed up to support polling
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const ows = openwhisk();
        each(params.topics.split(','), (topic, callback) => {
            topic = topic.trim();
            if (params.polling_supported && (params.polling_supported === "true" || params.polling_supported === true)) {
                ows.actions.invoke({
                    name: "pubsub/backup_message",
                    params: {
                        topic: topic,
                        message: params.message
                    }
                });
            }
            ows.actions.invoke({
                name: "pubsub/send_to_topic_subscribers",
                params: {
                    topic: topic,
                    message: params.message
                }
            }).then(result => {
                    console.log('[publish-stateless.main] success: forwarded the topic and message');
                    callback();
                }
            ).catch(err => {
                    console.log('[publish-stateless.main] error: could NOT forward the topics');
                    callback(err);
                }
            );

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