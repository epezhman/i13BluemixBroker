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

  echo -e "${YELLOW}Installing OpenWhisk actions, and rules for check-deposit...${NC}"

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

  echo "Creating Actions"
  wsk action create pubsub/subscribe_topics actions/subscribe-topics.js --web true
  wsk action create pubsub/unsubscribe_topics actions/unsubscribe-topics.js --web true
  wsk action create pubsub/get_sub_topics actions/get-subscribed-topics.js --web true
  wsk action create pubsub/register_subscriber actions/register-subscriber.js --web true
  wsk action create pubsub/publish_topic_based_1 actions/publish-topic-based-1.js --web true
  wsk action create pubsub/publish_topic_based_2 actions/publish-topic-based-2.js
  wsk action create pubsub/publish_content_based_1 actions/publish-content-based-1.js --web true
  wsk action create pubsub/publish_content_based_2 actions/publish-content-based-2.js
  wsk action create pubsub/publish_content_based_3 actions/publish-content-based-3.js
  wsk action create pubsub/unsubscribe_predicates actions/unsubscribe-predicates.js
  wsk action create pubsub/subscribe_predicates actions/subscribe-predicates.js --web true
  wsk action create pubsub/subscribe_predicates_add_predicates_to_subscribers actions/subscribe-predicates-add-predicates-to-subscribers.js
  wsk action create pubsub/subscribe_predicates_add_subscribers_to_predicates actions/subscribe-predicates-add-subscribers-to-predicates.js
  wsk action create pubsub/unsubscribe_predicates_remove_subscribers_from_predicates actions/unsubscribe-predicates-remove-subscribers-from-predicates.js
  wsk action create pubsub/bulk_subscribe_predicates actions/bulk-subscribe-predicates.js --web true
  wsk action create pubsub/bulk_subscribe_topics actions/bulk-subscribe-topics.js --web true
  wsk action create pubsub/subscribe_functions actions/subscribe-functions.js --web true
  wsk action create pubsub/unsubscribe_functions actions/unsubscribe-functions.js --web true
  wsk action create pubsub/bulk_subscribe_function actions/bulk-subscribe-function.js --web true
  wsk action create pubsub/publish_function_based_1 actions/publish-function-based-1.js --web true

  wsk action create pubsub/publish_topic_based_3 actions/publish-topic-based-2.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action create pubsub/publish_content_based_4 actions/publish-content-based-4.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action create pubsub/publish_function_based_2 actions/publish-function-based-2.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  echo "Creating API"
  wsk api create -n "SubscribeTopics" /pubsub /subscribe_topics post pubsub/subscribe_topics --response-type json
  wsk api create -n "UnsubscribeTopics" /pubsub /unsubscribe_topics post pubsub/unsubscribe_topics --response-type json
  wsk api create -n "GetSubscribedTopics" /pubsub /get_subscribed_topics get pubsub/get_sub_topics --response-type json
  wsk api create -n "RegisterSubscriber" /pubsub /register_subscriber get pubsub/register_subscriber --response-type json
  wsk api create -n "PublishTopicBased" /pubsub /publish_topic_based_1 post pubsub/publish_topic_based_1 --response-type json
  wsk api create -n "PublishContentBased" /pubsub /publish_content_based_1 post pubsub/publish_content_based_1 --response-type json
  wsk api create -n "SubscribePredicates" /pubsub /subscribe_predicates post pubsub/subscribe_predicates --response-type json
  wsk api create -n "BulkSubscribePredicates" /pubsub /bulk_subscribe_predicates post pubsub/bulk_subscribe_predicates --response-type json
  wsk api create -n "BulkSubscribe" /pubsub /bulk_subscribe_topics post pubsub/bulk_subscribe_topics --response-type json
  wsk api create -n "SubscribeFunction" /pubsub /subscribe_functions post pubsub/subscribe_functions --response-type json
  wsk api create -n "UnsubscribeFunction" /pubsub /unsubscribe_functions post pubsub/unsubscribe_functions --response-type json
  wsk api create -n "BulkSubscribeFunctions" /pubsub /bulk_subscribe_function post pubsub/bulk_subscribe_function --response-type json
  wsk api create -n "PublishFunctionBased" /pubsub /publish_function_based_1 post pubsub/publish_function_based_1 --response-type json

  echo -e "${GREEN}Install Complete${NC}"
}

function uninstall() {
  echo -e "${RED}Uninstalling...${NC}"

  echo "Removing Actions"
  wsk action delete pubsub/subscribe_topics
  wsk action delete pubsub/unsubscribe_topics
  wsk action delete pubsub/get_sub_topics
  wsk action delete pubsub/register_subscriber
  wsk action delete pubsub/publish_topic_based_1
  wsk action delete pubsub/publish_topic_based_2
  wsk action delete pubsub/publish_topic_based_3
  wsk action delete pubsub/publish_content_based_1
  wsk action delete pubsub/publish_content_based_2
  wsk action delete pubsub/publish_content_based_3
  wsk action delete pubsub/publish_content_based_4
  wsk action delete pubsub/unsubscribe_predicates
  wsk action delete pubsub/subscribe_predicates
  wsk action delete pubsub/subscribe_predicates_add_predicates_to_subscribers
  wsk action delete pubsub/subscribe_predicates_add_subscribers_to_predicates
  wsk action delete pubsub/unsubscribe_predicates_remove_subscribers_from_predicates
  wsk action delete pubsub/bulk_subscribe_predicates
  wsk action delete pubsub/bulk_subscribe_topics
  wsk action delete pubsub/subscribe_functions
  wsk action delete pubsub/unsubscribe_functions
  wsk action delete pubsub/bulk_subscribe_function
  wsk action delete pubsub/publish_function_based_1
  wsk action delete pubsub/publish_function_based_2


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
  wsk action update pubsub/subscribe_topics actions/subscribe-topics.js --web true
  wsk action update pubsub/unsubscribe_topics actions/unsubscribe-topics.js --web true
  wsk action update pubsub/get_sub_topics actions/get-subscribed-topics.js --web true
  wsk action update pubsub/register_subscriber actions/register-subscriber.js --web true
  wsk action update pubsub/publish_topic_based_1 actions/publish-topic-based-1.js --web true
  wsk action update pubsub/publish_topic_based_2 actions/publish-topic-based-2.js
  wsk action update pubsub/publish_content_based_1 actions/publish-content-based-1.js --web true
  wsk action update pubsub/publish_content_based_2 actions/publish-content-based-2.js
  wsk action update pubsub/publish_content_based_3 actions/publish-content-based-3.js
  wsk action update pubsub/unsubscribe_predicates actions/unsubscribe-predicates.js
  wsk action update pubsub/subscribe_predicates actions/subscribe-predicates.js --web true
  wsk action update pubsub/subscribe_predicates_add_predicates_to_subscribers actions/subscribe-predicates-add-predicates-to-subscribers.js
  wsk action update pubsub/subscribe_predicates_add_subscribers_to_predicates actions/subscribe-predicates-add-subscribers-to-predicates.js
  wsk action update pubsub/unsubscribe_predicates_remove_subscribers_from_predicates actions/unsubscribe-predicates-remove-subscribers-from-predicates.js
  wsk action update pubsub/bulk_subscribe_predicates actions/bulk-subscribe-predicates.js --web true
  wsk action update pubsub/bulk_subscribe_topics actions/bulk-subscribe-topics.js --web true
  wsk action update pubsub/subscribe_functions actions/subscribe-functions.js --web true
  wsk action update pubsub/unsubscribe_functions actions/unsubscribe-functions.js --web true
  wsk action update pubsub/bulk_subscribe_function actions/bulk-subscribe-function.js --web true
  wsk action update pubsub/publish_function_based_1 actions/publish-function-based-1.js --web true

  wsk action update pubsub/publish_topic_based_3 actions/publish-topic-based-3.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action update pubsub/publish_content_based_4 actions/publish-content-based-4.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  wsk action update pubsub/publish_function_based_2 actions/publish-function-based-2.js \
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