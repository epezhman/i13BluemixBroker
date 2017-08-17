const Cloudant = require('cloudant');
const each = require('async/each');


/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.topics              Topics to subscribe
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Standard OpenWhisk success/error response
 */

function main(params) {
    if (params.topics && params.subscriber_id) {

        return new Promise((resolve, reject) => {

            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });

            const subscribed_topics = cloudant.db.use('subscribed_topics');

            each(params.topics.split(','), (topic, mcb) => {
                topic = topic.trim();
                if (topic.length) {
                    let sub_id = `${topic}-${params.subscriber_id}`;
                    subscribed_topics.get(sub_id, (err, data) => {
                        if (err) {
                            subscribed_topics.insert({
                                _id: sub_id,
                                topic: topic,
                                subscriber: params.subscriber_id,
                                time: new Date(),
                                timestamp: Date.now()
                            }, (err, body, head) => {
                                if (err) {
                                    console.log(err);
                                    mcb('[last-read-subscribe.main] error: error insert subscriber first time')
                                }
                                else {
                                    mcb();
                                }
                            });
                        }
                        mcb();
                    });
                }
            }, (err) => {
                if (err) {
                    console.log('[subscribe.main] error: subscription not inserted');
                    console.log(err);
                    reject({
                        result: 'Error occurred inserting the subscriptions.'
                    });
                } else {
                    console.log('[subscribe.main] success: subscription insert');
                    resolve({
                        result: 'Success. Subscriptions inserted.'
                    });
                }
            });

        });
    }
    return {message: "Either subscriber id or topics are not provided"};
}
