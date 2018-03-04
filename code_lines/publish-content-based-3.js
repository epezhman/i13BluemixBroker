const openwhisk = require('openwhisk');
const Cloudant = require('cloudant');
let subscribers = {};
let last_checked_subscribers_contents = {};
const stale_time_ms = 1000;
function main(params) {
    return new Promise((resolve, reject) => {
        if (!last_checked_subscribers_contents.hasOwnProperty(params.subscriber_id)) {
            last_checked_subscribers_contents[params.subscriber_id] = Date.now();
        }
        if (subscribers.hasOwnProperty(params.subscriber_id) &&
            Date.now() - last_checked_subscribers_contents[params.subscriber_id] < stale_time_ms) {
            if (Object.keys(subscribers[params.subscriber_id]).length) {
                forwardPublications(params, Date.now(), resolve, reject)
            }
            else {
                console.log('[publish-content-based-3.main] error: does not have any predicates');
                reject({
                    result: "Does not have any predicates"
                })
            }
        }
        else {
            const cloudant = new Cloudant({
                account: params.CLOUDANT_USERNAME,
                password: params.CLOUDANT_PASSWORD
            });
            const subscribers_db = cloudant.db.use('subscribers');
            subscribers_db.get(params.subscriber_id, (err, result) => {
                if (!err) {
                    console.log('[publish-content-based-3.main] success: got the subscribed topics');
                    last_checked_subscribers_contents[params.subscriber_id] = Date.now();
                    subscribers[params.subscriber_id] = result.hasOwnProperty('predicates') ? result['predicates'] : [];
                    if (Object.keys(subscribers[params.subscriber_id]).length) {
                        forwardPublications(params, Date.now(), resolve, reject)
                    }
                    else {
                        console.log('[publish-content-based-3.main] error: does not have any predicates');
                        reject({
                            result: "Does not have any predicates"
                        })
                    }
                }
                else {
                    console.log('[publish-content-based-3.main] error: could not get the subscribed topics');
                    console.log(err);
                    reject({
                        result: "Error could not get the topics"
                    })
                }
            });
        }
    });
}
function forwardPublications(params, time, resolve, reject) {
    const ows = openwhisk();
    ows.actions.invoke({
        name: "pubsub/publish_content_based_4",
        params: {
            predicates: params.predicates,
            message: params.message,
            time: time,
            subscriber_predicates: subscribers[params.subscriber_id],
            subscriber_id: params.subscriber_id
        }
    }).then(result => {
            console.log('[cpublish-content-based-3.forwardPublications] success: forwarded to watson action');
            resolve({
                result: "Success: publication forwarded for matching."
            })
        }
    ).catch(err => {
            console.log('[publish-content-based-3.forwardPublications] error: could NOT forward the topic watson action');
            console.log(err);
            reject({
                result: "Error happened with publications"
            })
        }
    );
}