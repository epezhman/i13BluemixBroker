const Cloudant = require('cloudant');
const each = require('async/each');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.topics              Topics to subscribe
 * @param   params.subscriber_id       Subscriber ID
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
        const subscribed_topics = cloudant.db.use('subscribed_topics');
        each(params.topics.split(','), (topic, mcb) => {
            topic = topic.trim();
            if (topic.length) {
                subscribed_topics.get(topic, {revs_info: true}, (err, data) => {
                    if (!err) {
                        data.subscribers = array.remove(data.subscribers, function (_sub_id) {
                            return _sub_id !== params.subscriber_id
                        });
                        subscribed_topics.insert(data, (err, body, head) => {
                            if (err) {
                                console.log(err);
                                mcb('[unsubscribe.main] error: removing subscriber from topics list')
                            }
                            else {
                                removeTopicToSubscriber(cloudant, topic, params.subscriber_id, mcb);
                            }
                        });
                    }
                    else {
                        mcb();
                    }
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

function removeTopicToSubscriber(cloudant, topic, subscriber_id, mcb) {
    const subscribers = cloudant.db.use('subscribers');
    subscribers.get(subscriber_id, {revs_info: true}, (err, data) => {
        if (!err) {
            data.topics = data.hasOwnProperty('topics') ? array.remove(data.topics, function (_topic) {
                return _topic !== topic
            }) : [];
            subscribers.insert(data, (err, body, head) => {
                if (err) {
                    console.log(err);
                    mcb('[unsubscribe.removeTopicToSubscriber] error: removing topics from subscribers list')
                }
                else {
                    mcb()
                }
            });
        }
        else {
            mcb('[unsubscribe.removeTopicToSubscriber] error: subscriber does not exist')
        }
    });
}