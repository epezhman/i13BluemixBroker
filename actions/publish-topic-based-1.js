const each = require('async/each');
const openwhisk = require('openwhisk');

/**
 * 1.   It receives a message and its topics from the publisher and forwards to the next action
 *
 * @param   params.topics              The topics of the message
 * @param   params.message             The body of the published message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const ows = openwhisk();
        each(params.topics.split(','), (topic, callback) => {
            topic = topic.trim();
            ows.actions.invoke({
                name: "pubsub/publish_topic_based_2",
                params: {
                    topic: topic,
                    message: params.message
                }
            }).then(result => {
                    console.log('[publish-topic-based-1.main] success: forwarded the topic and message');
                    callback();
                }
            ).catch(err => {
                    console.log('[publish-topic-based-1.main] error: could NOT forward the topics');
                    callback(err);
                }
            );

        }, (err) => {
            if (err) {
                console.log('[publish-topic-based-1.main] error: message not published ');
                console.log(err);
                reject({
                    result: 'Error occurred publishing the message.'
                });
            } else {
                console.log('[publish-topic-based-1.main] success: message published');
                resolve({
                    result: 'Success. Message Published.'
                });
            }
        });
    });
}
