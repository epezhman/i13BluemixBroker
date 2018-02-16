const openwhisk = require('openwhisk');

/**
 * 1.   It receives a message and its content's predicates from the publisher and forwards to the next action
 *
 * @param   params.predicates            The predicates of the message
 * @param   params.message             The body of the published message
 * @param   params.CLOUDANT_USERNAME   Cloudant username (set once at action update time)
 * @param   params.CLOUDANT_PASSWORD   Cloudant password (set once at action update time)
 * @return                             Promise OpenWhisk success/error response
 */

function main(params) {
    return new Promise((resolve, reject) => {
        const ows = openwhisk();
        let predicates = JSON.parse(params.predicates);
        let orderedPredicates = {};
        Object.keys(predicates).sort().forEach(function(key) {
            orderedPredicates[key] = predicates[key];
        });
        let firstPredicate = null;
        for (let predicate in orderedPredicates) {
            if (orderedPredicates.hasOwnProperty(predicate)) {
                firstPredicate = predicate;
                break;
            }
        }
        if (firstPredicate && firstPredicate.length) {
            ows.actions.invoke({
                name: "pubsub/publish_content_based_2",
                params: {
                    first_predicate: firstPredicate.toLowerCase(),
                    predicates: orderedPredicates,
                    message: params.message
                }
            }).then(result => {
                    console.log('[publish-content-based-1.main] success: forwarded the contents and message');
                    resolve({
                        result: 'Success. Message Published.'
                    });
                }
            ).catch(err => {
                    console.log('[publish-content-based-1.main] error: could NOT forward the contents');
                    reject({
                        result: 'Error occurred publishing the message.'
                    });
                }
            );
        }
        else {
            reject({
                result: 'Error, no content predicate found.'
            });
        }
    });
}