const Cloudant = require('cloudant');
const eachSeries = require('async/eachSeries');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple functions at once
 *
 * @param   params.sub_type            Subscription Type
 * @param   params.matching_input      Matching Function Input
 * @param   params.matching_function   Matching Function
 * @param   params.subscribers       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise<any> OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        try {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });

            const subscribed_functions = cloudant.db.use('subscribed_functions');
            const subscribers = cloudant.db.use('subscribers');

            let subs = params.subscribers.split(',');
            let sub_type = params.sub_type.trim();
            let func_inputs = [];
            let func_temp = params.matching_input.trim().split(',');
            func_temp.forEach((func_input) => {
                if(func_input.trim().length)
                {
                    func_inputs.push(func_input.trim());
                }
            });

            eachSeries(subs, (sub_id, ecb) => {
                subscribers.get(sub_id, {revs_info: true}, (err, data) => {
                    if (!err) {

                        data.function_matching = Array.isArray(data.function_matching) ? data.function_matching : [];
                        data.function_matching = array.remove(data.function_matching, function (sub_info) {
                            return sub_info["sub_type"] !== sub_type
                        });
                        data.function_matching = array.union(data.function_matching, [{
                            sub_type: sub_type,
                            matching_input: func_inputs,
                            matching_function: params.matching_function
                        }]);

                        subscribers.insert(data, (err, body, head) => {
                            if (err) {
                                console.log('[bulk-subscribe-function.main] error: could not add the function to subscribers.');
                                console.log(err);
                                setTimeout(ecb, 25);
                            }
                            else {
                                console.log('[bulk-subscribe-function.main] success: added the function to the subscribers.');
                                setTimeout(ecb, 25);
                            }
                        });
                    }
                    else {
                        console.log('[bulk-subscribe-function.main] error: did not find the subscriber.');
                        console.log(err);
                        setTimeout(ecb, 25);
                    }
                });
            }, (err) => {
                if (err) {
                    console.log('[bulk-subscribe-function.main] error: subscription not inserted');
                    console.log(err);
                    reject({
                        result: 'Error occurred inserting the subscriptions.'
                    });
                } else {
                    console.log('[bulk-subscribe-function.main] success: subscription insert');

                    let temp_functions = [];

                    for (let i = 0; i < subs.length; i++) {
                        temp_functions.push({
                            subscriber_id: subs[i],
                            matching_input: func_inputs,
                            matching_function: params.matching_function
                        });
                    }
                    subscribed_functions.get(sub_type, {revs_info: true}, (err, data) => {
                        if (err) {
                            subscribed_functions.insert({
                                _id: sub_type,
                                sub_type: sub_type,
                                subscribers: temp_functions
                            }, (err, body, head) => {
                                if (err) {
                                    console.log(err);
                                    console.error('[subscribe-functions.main] error: error insert subscriber first time');
                                    reject({
                                        result: 'Error insert subscriber first time.'
                                    });
                                }
                                else {
                                    resolve({
                                        result: 'Success. Subscriptions inserted.'
                                    });
                                }
                            });
                        }
                        else {
                            data.subscribers = temp_functions;
                            subscribed_functions.insert(data, (err, body, head) => {
                                if (err) {
                                    console.log(err);
                                    console.error('[subscribe-functions.main] error: appending subscriber first time');
                                    reject({
                                        result: 'Error appending subscriber first time.'
                                    });
                                }
                                else {
                                    resolve({
                                        result: 'Success. Subscriptions inserted.'
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
        catch (err) {
            console.log(err);
            reject({
                result: 'Some Error'
            });
        }
    });
}
