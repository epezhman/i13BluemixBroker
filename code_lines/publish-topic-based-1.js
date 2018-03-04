const each = require('async/each');
const openwhisk = require('openwhisk');
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
