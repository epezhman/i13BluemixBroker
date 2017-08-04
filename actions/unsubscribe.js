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

            const subscribers = cloudant.db.use('subscribers');

            each(params.topics.split(','), (topic, mcb) => {
                topic = topic.trim();
                if (topic.length) {
                    let sub_id = `${topic}-${params.subscriber_id}`;
                    subscribers.get(sub_id, {revs_info: true}, (err, data) => {
                        if (!err) {
                            subscribers.destroy(sub_id, data._rev, (err, body, head) => {
                                if (err) {
                                    console.log(err);
                                    mcb('[unsubscribe.main] error: error delete subscription')
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
                    console.log('[unsubscribe.main] error: subscription not deleted');
                    console.log(err);
                    reject({
                        result: 'Error occurred deleting the subscriptions.'
                    });
                } else {
                    console.log('[unsubscribe.main] success: subscription deleted');
                    resolve({
                        result: 'Success. Subscriptions deleted.'
                    });
                }
            });

        });
    }
    return {message: "Either subscriber id or topics are not provided"};
}