const Cloudant = require('cloudant');
const each = require('async/each');

/**
 * 1.   It receives a message and its topics from the publisher and submits them to the Cloudant
 *
 * @param   params.topics              The topics of the message
 * @param   params.message             The body of the published message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Standard OpenWhisk success/error response
 */

function main(params) {
    if (params.topics && params.message) {
        return new Promise((resolve, reject) => {

            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });

            const messages = cloudant.db.use('published_messages');
            each(params.topics.split(','), (topic, mcb) => {
                topic = topic.trim();
                if (topic.length) {
                    messages.insert({
                        topics: topic,
                        message: params.message,
                        time: new Date(),
                        timestamp: Date.now()
                    }, (err, body, head) => {
                        if (err) {
                            mcb(err);
                        }
                        else {
                            mcb();
                        }
                    });
                }
            }, (err) => {
                if (err) {
                    console.log('[publish.main] error: message not insert');
                    console.log(err);
                    reject({
                        result: 'Error occurred inserting the message.'
                    });
                } else {
                    console.log('[publish.main] success: message insert');
                    resolve({
                        result: 'Success. Topic Message inserted.'
                    });
                }
            });
        });
    }
    return {message: "Either message or topics are not provided"};
}