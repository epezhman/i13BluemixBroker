const requestPromise = require('request-promise');

/**
 * 1.   It receives a message and its topics from the publisher and submits them to the Cloudant
 *
 * @param   params.predicates                   The predicates of the message
 * @param   params.message                      The body of the published message
 * @param   params.time                         The message time
 * @param   params.subscriber_id                The subscriber ID
 * @param   params.subscriber_predicates        The subscriber predicates
 * @param   params.CLOUDANT_USERNAME            Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD            Cloudant password (set once at action update time)
 * @param   params.WATSON_IOT_ORG               Watson IoT Org (set once at action update time)
 * @param   params.WATSON_IOT_APPLICATION_TYPE  Watson IoT Application Type (set once at action update time)
 * @param   params.WATSON_IOT_API_USERNAME      Watson IoT Username (set once at action update time)
 * @param   params.WATSON_IOT_API_PASSWORD      Watson IoT Password(set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        if (Object.keys(params.predicates).length) {
            let accepted = false;
            for (let predicate in params.subscriber_predicates) {
                if (params.subscriber_predicates.hasOwnProperty(predicate)
                    && params.predicates.hasOwnProperty(predicate)) {
                    let operator = params.subscriber_predicates[predicate]['operator'];
                    if (operator === '>=' || operator === '>' || operator === '<' || operator === '<=') {
                        let publicationVal = parseFloat(params.predicates[predicate]['val']);
                        let subscriberVal = parseFloat(params.subscriber_predicates[predicate]['val']);
                        if (isNaN(publicationVal) || isNaN(subscriberVal)) {
                            accepted = false;
                            break;
                        }
                        else {
                            if (operator === '>=') {
                                if (subscriberVal >= subscriberVal) {
                                    accepted = true;
                                }
                                else {
                                    accepted = false;
                                    break;
                                }

                            } else if (operator === '>') {
                                if (publicationVal > subscriberVal) {
                                    accepted = true;
                                }
                                else {
                                    accepted = false;
                                    break;
                                }

                            } else if (operator === '<') {
                                if (publicationVal < subscriberVal) {
                                    accepted = true;
                                }
                                else {
                                    accepted = false;
                                    break;
                                }

                            } else if (operator === '<=') {
                                if (publicationVal <= subscriberVal) {
                                    accepted = true;
                                }
                                else {
                                    accepted = false;
                                    break;
                                }
                            }
                        }
                    } else if (operator === '=') {
                        let publicationVal = params.predicates[predicate]['val'].toString();
                        let subscriberVal = params.subscriber_predicates[predicate]['val'].toString();
                        if (publicationVal === subscriberVal) {
                            accepted = true;
                        }
                        else {
                            accepted = false;
                            break;
                        }
                    }
                }
                else {
                    accepted = false;
                    break;
                }
            }
            if (accepted) {
                sendToWatson(params, resolve, reject)
            }
        }
        else {
            reject({
                result: "Error, the subscriber has no predicates"
            });
        }
    });
}

function sendToWatson(params, resolve, reject) {
    let subscriber_url = `https://${params.WATSON_IOT_ORG}.messaging.internetofthings.ibmcloud.com:8883/api/v0002/application/types/${params.WATSON_IOT_APPLICATION_TYPE}/devices/${params.subscriber_id}/commands/published_message`;
    let req_options = {
        uri: subscriber_url,
        method: 'POST',
        body: {
            message: params.message,
            predicates: params.predicates,
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
            console.log(`[forward-content-based-publication.main] success: Message sent to Watson`);
            resolve({
                result: 'Success. Message Sent to Watson.'
            });
        })
        .catch(function (err) {
            console.log(`[forward-content-based-publication.main] error: Message could not be sent to ${params.subscriber_id}`);
            console.log(err);
            reject({
                result: 'Error. Message could not be sent to Watson.'
            });
        });
}