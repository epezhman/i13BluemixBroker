const Cloudant = require('cloudant');
const each = require('async/each');
const requestPromise = require('request-promise');

/**
 * 1.   Send the published messages to subscribers
 *
 * @param   params.message                       Message
 * @param   params.topic                         Topic
 * @param   params.timestamp                     Timestamp
 * @param   params.time                          Time
 * @param   params.CLOUDANT_USERNAME             Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD             Cloudant password (set once at action update time)
 * @param   params.WATSON_IOT_ORG                Watson IoT Org (set once at action update time)
 * @param   params.WATSON_IOT_APPLICATION_TYPE   Watson IoT Application Type (set once at action update time)
 * @param   params.WATSON_IOT_API_USERNAME       Watson IoT Username (set once at action update time)
 * @param   params.WATSON_IOT_API_PASSWORD       Watson IoT Password(set once at action update time)
 * @return                             {message: string} OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        console.log('[broker.main] Sending out published messages');
        const cloudant = new Cloudant({
            account: params.CLOUDANT_USERNAME,
            password: params.CLOUDANT_PASSWORD
        });
        const subscribed_topics = cloudant.db.use('subscribed_topics');

        subscribed_topics.find({
            "selector": {
                "topic": params.topic
            },
            "fields": [
                "subscriber"
            ]
        }, (err, result) => {
            if (!err) {
                console.log('[get-subscribed-topics.main] success: got the subscribed topics');
                each(result.docs, function (sub_id, callback) {
                    let subscriber_url = `http://${params.WATSON_IOT_ORG}.messaging.internetofthings.ibmcloud.com:1883/api/v0002/application/types/${params.WATSON_IOT_APPLICATION_TYPE}/devices/${sub_id.subscriber}/commands/published_message`;
                    let req_options = {
                        uri: subscriber_url,
                        method: 'POST',
                        body: {
                            message: params.message,
                            topic: params.topic,
                            timestamp: params.timestamp,
                            time: params.time
                        },
                        auth: {
                            'username': params.WATSON_IOT_API_USERNAME,
                            'password': params.WATSON_IOT_API_PASSWORD
                        },
                        json: true
                    };
                    requestPromise(req_options)
                        .then(function (parsedBody) {
                            callback()
                        })
                        .catch(function (err) {
                            console.log(`[broker.main] error: Message could not be sent to ${sub_id.subscriber}`);
                            callback()
                        });

                }, function (err) {
                    if (err) {
                        console.log('[broker.main] error: Error in sending the message to subscribers');
                        console.log(err);
                        return reject({
                            result: 'Error in query the topic subscribers'
                        });

                    } else {
                        console.log('[broker.main] success: Successfully sent messages to subscribers');
                        return resolve({
                            result: 'Message sent to subscribers'
                        });
                    }
                });
            }
            else {
                console.log('[broker.main] error: Error in getting the topic subscribers');
                console.log(err);
                return reject({
                    result: 'Error in query the topic subscribers'
                });
            }
        });
    });
}
