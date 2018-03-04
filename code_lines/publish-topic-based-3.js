const requestPromise = require('request-promise');
function main(params) {
    return new Promise((resolve, reject) => {
        let subscriber_url = `https://${params.WATSON_IOT_ORG}.messaging.internetofthings.ibmcloud.com:8883/api/v0002/application/types/${params.WATSON_IOT_APPLICATION_TYPE}/devices/${params.subscriber_id}/commands/published_message`;
        let req_options = {
            uri: subscriber_url,
            method: 'POST',
            body: {
                message: params.message,
                topic: params.topic,
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
                console.log(`[publish-topic-based-3.main] success: Message sent to Watson`);
                resolve({
                    result: 'Success. Message Sent to Watson.'
                });
            })
            .catch(function (err) {
                console.log(`[publish-topic-based-3.main] error: Message could not be sent to ${params.subscriber_id}`);
                console.log(err);
                reject({
                    result: 'Error. Message could not be sent to Watson.'
                });
            });
    });
}