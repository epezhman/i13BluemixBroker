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
        let predicateLower = params.predicate.toLowerCase();
        subscribed_predicates.get(predicateLower, {revs_info: true}, (err, data) => {
            if (err) {
                subscribed_predicates.insert({
                    _id: predicateLower,
                    subject: predicateLower,
                    subscribers: [params.subscriber_id]
                }, (err, body, head) => {
                    if (err) {
                        console.log('[subscribe-predicates-add-subscribers-to-predicates.main] error: subscriber NOT added to predicate for first time.');
                        console.log(err);
                        reject({
                            result: 'Error. subscriber NOT added to predicates'
                        });
                    }
                    else {
                        console.log('[subscribe-predicates-add-subscribers-to-predicates.main] success: subscriber add to predicate for first time.');
                        resolve({
                            result: 'Success. subscriber added to predicates'
                        });
                    }
                });
            }
            else {
                data.subscribers = array.union(data.subscribers, [params.subscriber_id]);
                subscribed_predicates.insert(data, (err, body, head) => {
                    if (err) {
                        console.log('[subscribe-predicates-add-subscribers-to-predicates.main] error: subscriber NOT added to predicate.');
                        console.log(err);
                        reject({
                            result: 'Error. subscriber NOT added to predicates'
                        });
                    }
                    else {
                        console.log('[subscribe-predicates-add-subscribers-to-predicates.main] success: subscriber add to predicate.');
                        resolve({
                            result: 'Success. subscriber added to predicates'
                        });
                    }
                });
            }
        });
    });
}