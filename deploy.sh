#!/bin/bash

# Color vars to be used in shell script output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

source local.env

function usage() {
  echo -e "${YELLOW}Usage: $0 [--install,--uninstall,--update,--reinstall,--env]${NC}"
}

function install() {
  # Exit if any command fails
  set -e

  echo -e "${YELLOW}Installing OpenWhisk actions, triggers, and rules for check-deposit...${NC}"

  echo "Logging in to Bluemix"
  wsk bluemix login --user $OPENWHISK_USER_NAME \
  --password $OPENWHISK_PASSWORD \
  --namespace $OPENWHISK_NAMESPACE

  echo "Creating PubSub package"
  wsk package create pubsub \
    --param "CLOUDANT_USERNAME" $CLOUDANT_USERNAME \
    --param "CLOUDANT_PASSWORD" $CLOUDANT_PASSWORD

  echo "Binding Cloudant package with credential parameters"
  wsk package bind /whisk.system/cloudant "$CLOUDANT_INSTANCE" \
  --param username "$CLOUDANT_USERNAME" \
  --param password "$CLOUDANT_PASSWORD" \
  --param host "$CLOUDANT_USERNAME.cloudant.com"

  echo "Creating trigger to fire events when messages are published"
  wsk trigger create message-published \
    --feed "/_/$CLOUDANT_INSTANCE/changes" \
    --param dbname "$CLOUDANT_PUBLISHED_MESSAGES_DATABASE"

  echo "Creating Actions"
  wsk action create pubsub/publish_topic_based actions/publish-topic-based.js --web true
  wsk action create pubsub/last_read actions/last-read-subscriber.js --web true
  wsk action create pubsub/subscribe actions/subscribe.js --web true
  wsk action create pubsub/unsubscribe actions/unsubscribe.js --web true
  wsk action create pubsub/get_sub_topics actions/get-subscribed-topics.js --web true
  wsk action create pubsub/get_sub_messages actions/get-subscribed-messages.js --web true
  wsk action create pubsub/register_subscriber actions/register-subscriber.js --web true
  wsk action create pubsub/publish_stateless actions/publish-stateless.js --web true
  wsk action create pubsub/send_to_topic_subscribers actions/send-to-topic-subscribers.js
  wsk action create pubsub/backup_message actions/backup-message.js
  wsk action create pubsub/publish_content_based_stateless actions/publish-content-based-stateless.js --web true
  wsk action create pubsub/send_to_content_subscribers actions/send-to-content-subscribers.js
  wsk action create pubsub/cache_content_based_subscribers actions/cache-content-based-subscribers.js
  wsk action create pubsub/unsubscribe_predicates actions/unsubscribe-predicates.js
  wsk action create pubsub/subscribe_predicates actions/subscribe-predicates.js --web true
  wsk action create pubsub/add_predicates_to_subscribers actions/add-predicates-to-subscribers.js
  wsk action create pubsub/add_subscribers_to_predicates actions/add-subscribers-to-predicates.js
  wsk action create pubsub/remove_subscribers_from_predicates actions/remove-subscribers-from-predicates.js
  wsk action create pubsub/bulk_subscribe_predicates actions/bulk-subscribe-predicates.js --web true
  wsk action create pubsub/bulk_subscribe actions/bulk-subscribe.js --web true
  wsk action create pubsub/subscribe_functions actions/subscribe-functions.js --web true
  wsk action create pubsub/unsubscribe_functions actions/unsubscribe-functions.js --web true
  wsk action create pubsub/bulk_subscribe_function actions/bulk-subscribe-function.js --web true
  wsk action create pubsub/publish_function_based actions/publish-function-based.js --web true

  wsk action create pubsub/broker actions/broker.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action create pubsub/forward_publication actions/forward-publication.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action create pubsub/perform_content_based_matching_forward_message actions/perform-content-based-matching-forward-message.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action create pubsub/do_function_matching_and_forward_if_match actions/do-function-matching-and-forward-if-match.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  echo "Creating sequence that ties published message read to broker action"
  wsk action create pubsub/broker-sequence \
    --sequence /_/$CLOUDANT_INSTANCE/read,pubsub/broker

  echo "Creating rule that maps published messages change trigger to broker sequence"
  wsk rule create broker-rule message-published pubsub/broker-sequence

  echo "Creating API"
  wsk api create -n "PublishTopicBased" /pubsub /publish_topic_based post pubsub/publish_topic_based --response-type json
  wsk api create -n "Subscribe" /pubsub /subscribe post pubsub/subscribe --response-type json
  wsk api create -n "Unsubscribe" /pubsub /unsubscribe post pubsub/unsubscribe --response-type json
  wsk api create -n "GetSubscribedTopics" /pubsub /get_subscribed_topics get pubsub/get_sub_topics --response-type json
  wsk api create -n "SubscribeLastRead" /pubsub /last_read get pubsub/last_read --response-type json
  wsk api create -n "GetSubscribedMessages" /pubsub /get_subscribed_messages get pubsub/get_sub_messages --response-type json
  wsk api create -n "RegisterSubscriber" /pubsub /register_subscriber get pubsub/register_subscriber --response-type json
  wsk api create -n "PublishStateless" /pubsub /publish_stateless post pubsub/publish_stateless --response-type json
  wsk api create -n "PublishContentBasedStateless" /pubsub /publish_content_based_stateless post pubsub/publish_content_based_stateless --response-type json
  wsk api create -n "SubscribePredicates" /pubsub /subscribe_predicates post pubsub/subscribe_predicates --response-type json
  wsk api create -n "BulkSubscribePredicates" /pubsub /bulk_subscribe_predicates post pubsub/bulk_subscribe_predicates --response-type json
  wsk api create -n "BulkSubscribe" /pubsub /bulk_subscribe post pubsub/bulk_subscribe --response-type json
  wsk api create -n "SubscribeFunction" /pubsub /subscribe_functions post pubsub/subscribe_functions --response-type json
  wsk api create -n "UnsubscribeFunction" /pubsub /unsubscribe_functions post pubsub/unsubscribe_functions --response-type json
  wsk api create -n "BulkSubscribeFunctions" /pubsub /bulk_subscribe_function post pubsub/bulk_subscribe_function --response-type json
  wsk api create -n "PublishFunctionBased" /pubsub /publish_function_based post pubsub/publish_function_based --response-type json

  echo -e "${GREEN}Install Complete${NC}"
}

function uninstall() {
  echo -e "${RED}Uninstalling...${NC}"

  echo "Removing rules..."
  wsk rule disable broker-rule
  sleep 1
  wsk rule delete broker-rule

  echo "Removing triggers..."
  wsk trigger delete message-published

  echo "Removing Actions"
  wsk action delete pubsub/publish_topic_based
  wsk action delete pubsub/last_read
  wsk action delete pubsub/subscribe
  wsk action delete pubsub/unsubscribe
  wsk action delete pubsub/broker
  wsk action delete pubsub/get_sub_topics
  wsk action delete pubsub/get_sub_messages
  wsk action delete pubsub/register_subscriber
  wsk action delete pubsub/publish_stateless
  wsk action delete pubsub/send_to_topic_subscribers
  wsk action delete pubsub/forward_publication
  wsk action delete pubsub/backup_message
  wsk action delete pubsub/publish_content_based_stateless
  wsk action delete pubsub/send_to_content_subscribers
  wsk action delete pubsub/cache_content_based_subscribers
  wsk action delete pubsub/perform_content_based_matching_forward_message
  wsk action delete pubsub/unsubscribe_predicates
  wsk action delete pubsub/subscribe_predicates
  wsk action delete pubsub/add_predicates_to_subscribers
  wsk action delete pubsub/add_subscribers_to_predicates
  wsk action delete pubsub/remove_subscribers_from_predicates
  wsk action delete pubsub/bulk_subscribe_predicates
  wsk action delete pubsub/bulk_subscribe
  wsk action delete pubsub/subscribe_functions
  wsk action delete pubsub/unsubscribe_functions
  wsk action delete pubsub/bulk_subscribe_function
  wsk action delete pubsub/do_function_matching_and_forward_if_match
  wsk action delete pubsub/publish_function_based

  echo "Removing Sequences"
  wsk action delete pubsub/broker-sequence

  echo "Removing packages..."
  wsk package delete "$CLOUDANT_INSTANCE"

  echo "Deleting API"
  wsk api delete /pubsub

  echo "Removing package..."
  wsk package delete pubsub

  echo -e "${GREEN}Uninstall Complete${NC}"
}

function reinstall() {
    uninstall
    install
}

function showEnv() {
  echo -e "${YELLOW}Env Values"

  echo CLOUDANT_INSTANCE=$CLOUDANT_INSTANCE
  echo CLOUDANT_USERNAME=$CLOUDANT_USERNAME
  echo CLOUDANT_PASSWORD=$CLOUDANT_PASSWORD

  echo OPENWHISK_USER_NAME=$OPENWHISK_USER_NAME
  echo OPENWHISK_PASSWORD=$OPENWHISK_PASSWORD
  echo OPENWHISK_NAMESPACE=$OPENWHISK_NAMESPACE
  echo OPENWHISK_SPACE=$OPENWHISK_SPACE
  echo OPENWHISK_ORG=$OPENWHISK_ORG
  echo OPENWHISK_API_KEY=$OPENWHISK_API_KEY

  echo WATSON_IOT_ORG=$WATSON_IOT_ORG
  echo WATSON_IOT_APPLICATION_TYPE=$WATSON_IOT_APPLICATION_TYPE
  echo WATSON_IOT_API_USERNAME=$WATSON_IOT_API_USERNAME
  echo WATSON_IOT_API_PASSWORD=$WATSON_IOT_API_PASSWORD

  echo -e "${NC}"
}

function updateActions()
{
  wsk action update pubsub/publish_topic_based actions/publish-topic-based.js --web true
  wsk action update pubsub/last_read actions/last-read-subscriber.js --web true
  wsk action update pubsub/subscribe actions/subscribe.js --web true
  wsk action update pubsub/unsubscribe actions/unsubscribe.js --web true
  wsk action update pubsub/get_sub_topics actions/get-subscribed-topics.js --web true
  wsk action update pubsub/get_sub_messages actions/get-subscribed-messages.js --web true
  wsk action update pubsub/register_subscriber actions/register-subscriber.js --web true
  wsk action update pubsub/publish_stateless actions/publish-stateless.js --web true
  wsk action update pubsub/send_to_topic_subscribers actions/send-to-topic-subscribers.js
  wsk action update pubsub/backup_message actions/backup-message.js
  wsk action update pubsub/publish_content_based_stateless actions/publish-content-based-stateless.js --web true
  wsk action update pubsub/send_to_content_subscribers actions/send-to-content-subscribers.js
  wsk action update pubsub/cache_content_based_subscribers actions/cache-content-based-subscribers.js
  wsk action update pubsub/unsubscribe_predicates actions/unsubscribe-predicates.js
  wsk action update pubsub/subscribe_predicates actions/subscribe-predicates.js --web true
  wsk action update pubsub/add_predicates_to_subscribers actions/add-predicates-to-subscribers.js
  wsk action update pubsub/add_subscribers_to_predicates actions/add-subscribers-to-predicates.js
  wsk action update pubsub/remove_subscribers_from_predicates actions/remove-subscribers-from-predicates.js
  wsk action update pubsub/bulk_subscribe_predicates actions/bulk-subscribe-predicates.js --web true
  wsk action update pubsub/bulk_subscribe actions/bulk-subscribe.js --web true
  wsk action update pubsub/subscribe_functions actions/subscribe-functions.js --web true
  wsk action update pubsub/unsubscribe_functions actions/unsubscribe-functions.js --web true
  wsk action update pubsub/bulk_subscribe_function actions/bulk-subscribe-function.js --web true
  wsk action update pubsub/publish_function_based actions/publish-function-based.js --web true

  wsk action update pubsub/broker actions/broker.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action update pubsub/forward_publication actions/forward-publication.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action update pubsub/perform_content_based_matching_forward_message actions/perform-content-based-matching-forward-message.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action update pubsub/do_function_matching_and_forward_if_match actions/do-function-matching-and-forward-if-match.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

}

case "$1" in
"--install" )
install
;;
"--uninstall" )
uninstall
;;
"--reinstall" )
reinstall
;;
"--update" )
updateActions
;;
"--env" )
showEnv
;;
* )
usage
;;
esac

# wsk api list -f