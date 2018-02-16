const Cloudant = require('cloudant');
const array = require('lodash/array');

/**
 * 1.   For subscribing to multiple topics at once
 *
 * @param   params.predicate           Predicate to subscribe
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
        const subscribed_predicates = cloudant.db.use('subscribed_predicates');
        subscribed_predicates.get(params.predicate, {revs_info: true}, (err, data) => {
            if (err) {
                console.log('[unsubscribe-predicates-remove-subscribers-from-predicates.main] error: could not find the predicate.');
                console.log(err);
                reject({
                    result: 'Error. could not find the predicates'
                });
            }
            else {
                data.subscribers = array.remove(data.subscribers, function (_sub_id) {
                    return _sub_id !== params.subscriber_id
                });
                subscribed_predicates.insert(data, (err, body, head) => {
                    if (err) {
                        console.log('[unsubscribe-predicates-remove-subscribers-from-predicates.main] error: subscriber NOT removed from predicate.');
                        console.log(err);
                        reject({
                            result: 'Error. subscriber NOT removed from predicates'
                        });
                    }
                    else {
                        console.log('[unsubscribe-predicates-remove-subscribers-from-predicates.main] success: subscriber removed from predicate.');
                        resolve({
                            result: 'Success. subscriber removed from predicates'
                        });
                    }
                });
            }
        });
    });
}