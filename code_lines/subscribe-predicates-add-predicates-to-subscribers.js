const Cloudant = require('cloudant');
function main(params) {
    return new Promise((resolve, reject) => {
        const cloudant = new Cloudant({
            account: params.CLOUDANT_USERNAME,
            password: params.CLOUDANT_PASSWORD
        });
        const subscribers = cloudant.db.use('subscribers');
        subscribers.get(params.subscriber_id, {revs_info: true}, (err, data) => {
            if (!err) {
                data.predicates = params.predicates;
                subscribers.insert(data, (err, body, head) => {
                    if (err) {
                        console.log('[subscribe-predicates-add-predicates-to-subscribers.main] error: could not add the predicates to subscribers.');
                        console.log(err);
                        reject({
                            result: 'Error. could not add the predicates to subscribers.'
                        });
                    }
                    else {
                        console.log('[subscribe-predicates-add-predicates-to-subscribers.main] success: added the predicates to the subscribers.');
                        resolve({
                            result: 'Success. added the predicates to subscribers.'
                        });
                    }
                });
            }
            else {
                console.log('[subscribe-predicates-add-predicates-to-subscribers.main] error: did not find the subscriber.');
                console.log(err);
                reject({
                    result: 'Error. did not find the subscriber.'
                });
            }
        });
    });
}
