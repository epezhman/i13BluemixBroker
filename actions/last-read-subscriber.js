const Cloudant = require('cloudant');
const uuid = require('uuid');

/**
 * 1.   It logs the last attempt of subscriber checking for new data
 *
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

        const sub_logs = cloudant.db.use('subscribers_logs');

        let sub_id = params.subscriber_id || uuid.v1();

        sub_logs.get(sub_id, {revs_info: true}, (err, data) => {
            if (err) {
                sub_logs.insert({
                    _id: sub_id,
                    time: new Date(),
                    timestamp: Date.now()
                }, (err, body, head) => {
                    if (err) {
                        console.log('[last-read-subscribe.main] error: error insert subscriber first time');
                        console.log(err);
                        reject({
                            result: 'Error occurred inserting the subscriber for first time.'
                        });
                    }
                    else {
                        console.log('[last-read-subscribe.main] success: success insert subscriber first time');
                        resolve({
                            result: 'Success. Subscriber added.'
                        });
                    }
                });
            }
            else {
                sub_logs.insert({
                    _id: data._id,
                    _rev: data._rev,
                    time: new Date(),
                    timestamp: Date.now()
                }, (err, body, head) => {
                    if (err) {
                        console.log('[last-read-subscribe.main] error: error updating subscriber log');
                        console.log(err);
                        reject({
                            result: 'Error occurred updating the subscriber log.'
                        });
                    }
                    else {
                        console.log('[last-read-subscribe.main] success: success updating subscriber log');
                        resolve({
                            result: 'Success. Subscriber updated.'
                        });
                    }
                });
            }
        });
    });
}