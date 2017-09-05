const openwhisk = require('openwhisk');

/**
 * 1.   It receives a message and its content's predicates from the publisher and forwards to the next action
 *
 * @param   params.contents            The predicates of the message
 * @param   params.message             The body of the published message
 * @param   params.polling_supported   If messages should be backed up to support polling
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const ows = openwhisk();
        let firstPredicate = null;
        for (let predicate in params.contents) {
            if (params.contents.hasOwnProperty(predicate)) {
                firstPredicate = predicate;
                break;
            }
        }
        if (firstPredicate) {
            if (params.polling_supported && params.polling_supported === "true") {
                ows.actions.invoke({
                    name: "pubsub/backup_content_based_message",
                    params: {
                        first_predicte: firstPredicate,
                        contents: params.contents,
                        message: params.message
                    }
                });
            }
            ows.actions.invoke({
                name: "pubsub/send_to_content_subscribers",
                params: {
                    first_predicate: firstPredicate,
                    contents: params.contents,
                    message: params.message
                }
            }).then(result => {
                    console.log('[publish-content-based-stateless.main] success: forwarded the contents and message');
                    resolve({
                        result: 'Success. Message Published.'
                    });
                }
            ).catch(err => {
                    console.log('[publish-content-based-stateless.main] error: could NOT forward the contents');
                    reject({
                        result: 'Error occurred publishing the message.'
                    });
                }
            );
        }
        else
        {
            reject({
                result: 'Error, no content predicate found.'
            });
        }
    });
}