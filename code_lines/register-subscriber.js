const Cloudant = require('cloudant');
const uuid = require('uuid');
function main(params) {
    return new Promise((resolve, reject) => {
        const cloudant = new Cloudant({
            account: params.CLOUDANT_USERNAME,
            password: params.CLOUDANT_PASSWORD
        });
        const subscribers = cloudant.db.use('subscribers');
        let _id = uuid.v1();
        subscribers.get(_id, {}, (err, data) => {
            if (err) {
                subscribers.insert({
                    _id: _id,
                    time: new Date(),
                    timestamp: Date.now()
                }, (err, body, head) => {
                    if (err) {
                        console.log('[register-subscriber.main] error: error in registering subscriber');
                        console.log(err);
                        reject({
                            result: 'Error occurred registering subscriber'
                        });
                    }
                    else {
                        console.log('[register-subscriber.main] success: success registering subscriber');
                        resolve({
                            sub_id: _id,
                            ok: true
                        });
                    }
                });
            }
            else {
                console.log('[register-subscriber.main] error: subscriber with this ID already exist');
                reject({
                    result: 'Subscriber with the ID exist'
                });
            }
        });
    });
}