const Cloudant = require('cloudant');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.sub_type            Subscription Type
 * @param   params.matching_input      Matching Function Input
 * @param   params.matching_function   Matching Function
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise<any> OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const cloudant = new Cloudant({
            account: params.CLOUDANT_USERNAME,
            password: params.CLOUDANT_PASSWORD
        });
        const subscribed_functions = cloudant.db.use('subscribed_functions');
        let sub_type = params.sub_type.trim();
        let func_inputs = params.matching_input.trim().split(',');
        if (sub_type.length) {
            subscribed_functions.get(sub_type, {revs_info: true}, (err, data) => {
                if (err) {
                    subscribed_functions.insert({
                        _id: sub_type,
                        sub_type: sub_type,
                        subscribers: [{
                            subscriber_id: params.subscriber_id,
                            matching_input: func_inputs,
                            matching_function: params.matching_function
                        }]
                    }, (err, body, head) => {
                        if (err) {
                            console.log(err);
                            console.error('[subscribe-functions.main] error: error insert subscriber first time');
                            reject({
                                result: 'Error insert subscriber first time.'
                            });
                        }
                        else {
                            return addFunctionToSubscriber(cloudant, sub_type, func_inputs,
                                params.matching_function, params.subscriber_id, resolve, reject);
                        }
                    });
                }
                else {
                    data.subscribers = array.remove(data.subscribers, function (sub_info) {
                        return sub_info["subscriber_id"] !== params.subscriber_id
                    });
                    data.subscribers = array.union(data.subscribers, [{
                        subscriber_id: params.subscriber_id,
                        matching_input: func_inputs,
                        matching_function: params.matching_function
                    }]);
                    subscribed_functions.insert(data, (err, body, head) => {
                        if (err) {
                            console.log(err);
                            console.error('[subscribe-functions.main] error: appending subscriber first time');
                            reject({
                                result: 'Error appending subscriber first time.'
                            });
                        }
                        else {
                            return addFunctionToSubscriber(cloudant, sub_type, func_inputs,
                                params.matching_function, params.subscriber_id, resolve, reject);

                        }
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

function addFunctionToSubscriber(cloudant, sub_type, matching_input, matching_function, subscriber_id, resolve, reject) {
    const subscribers = cloudant.db.use('subscribers');
    return subscribers.get(subscriber_id, {revs_info: true}, (err, data) => {
        if (!err) {
            data.function_matching = Array.isArray(data.function_matching) ? data.function_matching : [];
            data.function_matching = array.remove(data.function_matching, function (sub_info) {
                return sub_info["sub_type"] !== sub_type
            });
            data.function_matching = array.union(data.function_matching, [{
                sub_type: sub_type,
                matching_input: matching_input,
                matching_function: matching_function
            }]);

            return subscribers.insert(data, (err, body, head) => {
                if (err) {
                    console.log(err);
                    console.error('[subscribe-functions.addFunctionToSubscriber] error: appending functions to subscribers list');
                    reject({
                        result: 'Error appending functions to subscribers list'
                    });
                }
                else {
                    console.log('[subscribe-functions.addFunctionToSubscriber] success: added the function to publications and subscribers');
                    resolve({
                        result: 'Success. Function to publications and subscribers.'
                    });
                }
            });
        }
        else {
            console.error('[subscribe-functions.addFunctionToSubscriber] error: subscriber does not exist');
            reject({
                result: 'Error subscriber does not exist'
            });
        }
    });
}

