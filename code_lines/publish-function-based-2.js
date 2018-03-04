const requestPromise = require('request-promise');
function main(params) {
    try {
        return new Promise((resolve, reject) => {
            let matching_function = new Function(params.matching_input, params.matching_function);
            let temp_result = matching_function(params.message);
            if(temp_result === true)
            {
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
            else
            {
                resolve({
                    result: 'Function was not matching with the value'
                });
            }
        });
    }
    catch (err) {
        console.log(err);
        reject({
            result: 'Some Error'
        });
    }
}