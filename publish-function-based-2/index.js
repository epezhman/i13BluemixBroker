/**
 * 1.   It receives a message and its topics from the publisher and submits them to the Cloudant
 *
 * @param   params.sub_type                     Subscription Type
 * @param   params.matching_input               Matching Function Input
 * @param   params.matching_function            Matching Function
 * @param   params.message                      Publication
 * @param   params.subscriber_id                Subscriber ID
 * @param   params.CLOUDANT_USERNAME            Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD            Cloudant password (set once at action update time)
 * @param   params.WATSON_IOT_ORG               Watson IoT Org (set once at action update time)
 * @param   params.WATSON_IOT_APPLICATION_TYPE  Watson IoT Application Type (set once at action update time)
 * @param   params.WATSON_IOT_API_USERNAME      Watson IoT Username (set once at action update time)
 * @param   params.WATSON_IOT_API_PASSWORD      Watson IoT Password(set once at action update time)
 * @return                                      Promise OpenWhisk success/error response
 */

function main(params) {

    try {
        const requestPromise = require('request-promise');
        const nlp = require('compromise');

        return new Promise((resolve, reject) => {
            try {

                let matching_function = new Function(params.matching_input, params.matching_function);
                let temp_result = matching_function(params.message);

                if (temp_result === true) {
                    let subscriber_url = `https://${params.WATSON_IOT_ORG}.messaging.internetofthings.ibmcloud.com:8883/api/v0002/application/types/${params.WATSON_IOT_APPLICATION_TYPE}/devices/${params.subscriber_id}/commands/published_message`;
                    let req_options = {
                        uri: subscriber_url,
                        method: 'POST',
                        body: {
                            message: params.message,
                            function_type: params.sub_type,
                            time: Date.now()
                        },
                        auth: {
                            'username': params.WATSON_IOT_API_USERNAME,
                            'password': params.WATSON_IOT_API_PASSWORD
                        },
                        json: true
                    };
                    requestPromise(req_options)
                        .then(function (parsedBody) {
                            console.log(`[publish-function-based-2.main] success: Message sent to Watson`);
                            resolve({
                                result: 'Success. Message Sent to Watson.'
                            });
                        })
                        .catch(function (err) {
                            console.log(`[publish-function-based-2.main] error: Message could not be sent to ${params.subscriber_id}`);
                            console.log(err);
                            reject({
                                result: 'Error. Message could not be sent to Watson.'
                            });
                        });
                }
                else {
                    resolve({
                        result: 'Function was not matching with the value'
                    });
                }
            }
            catch (err) {
                console.log(err);
                reject({
                    result: err.toString()
                });
            }
        });
    }
    catch (err) {
        console.log(err);
        return {result: err.toString()};
    }
}

exports.main = main;

// zip -r action.zip *
