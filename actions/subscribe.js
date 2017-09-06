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
 * @return                             Standard OpenWhisk success/error response
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
                    if (err) {
                        subscribed_topics.insert({
                            _id: topic,
                            topic: topic,
                            subscribers: [params.subscriber_id]
                        }, (err, body, head) => {
                            if (err) {
                                console.log(err);
                                mcb('[subscribe.main] error: error insert subscriber first time')
                            }
                            else {
                                addTopicToSubscriber(cloudant, topic, params.subscriber_id, mcb);
                            }
                        });
                    }
                    else {
                        subscribed_topics.insert({
                            _id: data._id,
                            _rev: data._rev,
                            subscribers: array.union(data.subscribers, [params.subscriber_id])
                        }, (err, body, head) => {
                            if (err) {
                                console.log(err);
                                mcb('[subscribe.main] error: appending subscriber first time')
                            }
                            else {
                                addTopicToSubscriber(cloudant, topic, params.subscriber_id, mcb);
                            }
                        });
                    }
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

function addTopicToSubscriber(cloudant, topic, subscriber_id, mcb) {
    const subscribers = cloudant.db.use('subscribers');
    subscribers.get(subscriber_id, {revs_info: true}, (err, data) => {
        if (!err) {
            subscribers.insert({
                _id: data._id,
                _rev: data._rev,
                topics: data.hasOwnProperty('topics') ? array.union(data.topics, [topic]) : [topic],
                predicates: data.hasOwnProperty('predicates') ? data.predicates : [],
                time: data.time,
                timestamp: data.timestamp
            }, (err, body, head) => {
                if (err) {
                    console.log(err);
                    mcb('[subscribe.main] error: appending topics to subscribers list')
                }
                else {
                    mcb()
                }
            });
        }
        else {
            mcb('[subscribe.main] error: subscriber does not exist')
        }
    });
}