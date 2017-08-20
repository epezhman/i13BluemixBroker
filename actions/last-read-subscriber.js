const Cloudant = require('cloudant');

/**
 * 1.   It logs the last attempt of subscriber checking for new data
 *
 * @param   params.subscriber_id       Subscriber ID
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Standard OpenWhisk success/error response
 */

function main(params) {
    if (params.hasOwnProperty('subscriber_id')) {
        return new Promise((resolve, reject) => {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const sub_logs = cloudant.db.use('subscribers_logs');
            sub_logs.get(params.subscriber_id, {revs_info: true}, (err, data) => {

                const time = new Date();
                const timestamp = Date.now();

                if (err) {
                    sub_logs.insert({
                        _id: params.subscriber_id,
                        time: time,
                        timestamp: timestamp
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
                                result: 0
                            });
                        }
                    });
                }
                else {
                    let old_timestamp = data.timestamp;
                    sub_logs.insert({
                        _id: data._id,
                        _rev: data._rev,
                        time: time,
                        timestamp: timestamp
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
                                result: old_timestamp
                            });
                        }
                    });
                }
            });
        });
    }
    return {message: "Subscriber Id is missing"};
}
