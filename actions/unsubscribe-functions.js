const Cloudant = require('cloudant');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.sub_type              Topics to subscribe
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
        const subscribed_functions = cloudant.db.use('subscribed_functions');
        let sub_type = params.sub_type.trim();
        if (sub_type.length) {
            subscribed_functions.get(sub_type, {revs_info: true}, (err, data) => {
                if (!err) {
                    data.subscribers = array.remove(data.subscribers, function (sub_info) {
                        return sub_info["subscriber_id"] !== params.subscriber_id
                    });
                    subscribed_functions.insert(data, (err, body, head) => {
                        if (err) {
                            console.log(err);
                            console.error('[unsubscribe-functions.main] error: removing subscriber from topics list');
                            reject({
                                result: 'Error removing subscriber from topics list'
                            });
                        }
                        else {
                            return removeFunctionFromSubscriber(cloudant, sub_type, params.subscriber_id, resolve, reject);
                        }
                    });
                }
                else {
                    reject({
                        result: 'Error removing subscriber function failed'
                    });
                }
            });
        }
        else {
            reject({
                result: 'Error No subscription function type'
            });
        }
    });
}

function removeFunctionFromSubscriber(cloudant, sub_type, subscriber_id, resolve, reject) {
    const subscribers = cloudant.db.use('subscribers');
    return subscribers.get(subscriber_id, {revs_info: true}, (err, data) => {
        if (!err) {
            data.function_matching = array.remove(data.function_matching, function (sub_info) {
                return sub_info["sub_type"] !== sub_type
            });
            return subscribers.insert(data, (err, body, head) => {
                if (err) {
                    console.log(err);
                    console.error('[unsubscribe-functions.removeFunctionFromSubscriber] error: removing functions from subscribers list');
                    reject({
                        result: 'Error  removing functions from subscribers list'
                    });
                }
                else {
                    console.log('[unsubscribe-functions.removeFunctionFromSubscriber] success: function subscription removed.');
                    resolve({
                        result: 'Success. Function subscription removed.'
                    });
                }
            });
        }
        else {
            console.error('[unsubscribe-functions.removeFunctionFromSubscriber] error: subscriber does not exist');
            reject({
                result: 'Error subscriber does not exist'
            });
        }
    });
}