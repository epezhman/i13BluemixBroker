const Cloudant = require('cloudant');

/**
 * 1.   It receives a message and its topics from the publisher and submits them to the Cloudant
 *
 * @param   params.topic               The topic of the message
 * @param   params.message             The body of the published message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const cloudant = new Cloudant({
            account: params.CLOUDANT_USERNAME,
            password: params.CLOUDANT_PASSWORD
        });
        const messages = cloudant.db.use('published_messages_bc');
        let topic = params.topic.trim();

        if (topic.length) {
            messages.insert({
                topic: topic,
                message: params.message,
                time: new Date(),
                timestamp: Date.now()
            }, (err, body, head) => {
                if (err) {
                    console.log('[backup-message.main] error: message not insert');
                    console.log(err);
                    reject({
                        result: 'Error occurred inserting the message.'
                    });
                }
                else {
                    console.log('[backup-message.main] success: message insert');
                    resolve({
                        result: 'Success. Topic Message inserted.'
                    });
                }
            });
        }
    });
}
