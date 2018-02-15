#!/bin/bash

# Color vars to be used in shell script output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

source ../local.env

function usage() {
  echo -e "${YELLOW}Usage: $0 [--install,--uninstall,--reinstall,--env]${NC}"
}

function install() {
  # Exit if any command fails
  set -e

  echo -e "${YELLOW}Installing OpenWhisk actions, triggers, and rules for check-deposit..."

  echo "Creating PubSub package"
  bx wsk package create pubsub \
    --param "CLOUDANT_USERNAME" $CLOUDANT_USERNAME \
    --param "CLOUDANT_PASSWORD" $CLOUDANT_PASSWORD

  echo "Binding Cloudant package with credential parameters"
  bx wsk package bind /whisk.system/cloudant "$CLOUDANT_INSTANCE" \
  --param username "$CLOUDANT_USERNAME" \
  --param password "$CLOUDANT_PASSWORD" \
  --param host "$CLOUDANT_USERNAME.cloudant.com"

  echo "Creating trigger to fire events when messages are published"
  bx wsk trigger create message-published \
    --feed "/_/$CLOUDANT_INSTANCE/changes" \
    --param dbname "$CLOUDANT_PUBLISHED_MESSAGES_DATABASE"

  echo "Creating Actions"
  bx wsk action create pubsub/publish actions/publish.js --web true
  bx wsk action create pubsub/last_read actions/last-read-subscriber.js
  bx wsk action create pubsub/subscribe actions/subscribe.js --web true
  bx wsk action create pubsub/unsubscribe actions/unsubscribe.js --web true
  bx wsk action create pubsub/get_sub_topics actions/get-subscribed-topics.js --web true
  bx wsk action create pubsub/get_sub_messages actions/get-subscribed-messages.js --web true
  bx wsk action create pubsub/register_subscriber actions/register-subscriber.js --web true

  bx wsk action create pubsub/broker actions/broker.js \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

   bx wsk action create pubsub/publish_stateless actions/publish-stateless.js --web true \
  --param "WATSON_IOT_ORG" $WATSON_IOT_ORG \
  --param "WATSON_IOT_APPLICATION_TYPE" $WATSON_IOT_APPLICATION_TYPE \
  --param "WATSON_IOT_API_USERNAME" $WATSON_IOT_API_USERNAME \
  --param "WATSON_IOT_API_PASSWORD" $WATSON_IOT_API_PASSWORD

  echo "Creating sequence that ties published message read to broker action"
  bx wsk action create pubsub/broker-sequence \
    --sequence /_/$CLOUDANT_INSTANCE/read,pubsub/broker

  echo "Creating rule that maps published messages change trigger to broker sequence"
  bx wsk rule create broker-rule message-published pubsub/broker-sequence

  echo "Creating API"
  bx wsk api create -n "Publish" /pubsub /publish post pubsub/publish --response-type json
  bx wsk api create -n "Subscribe" /pubsub /subscribe post pubsub/subscribe --response-type json
  bx wsk api create -n "Unsubscribe" /pubsub /unsubscribe post pubsub/unsubscribe --response-type json
  bx wsk api create -n "GetSubscribedTopics" /pubsub /get_subscribed_topics get pubsub/get_sub_topics --response-type json
  bx wsk api create -n "GetSubscribedMessages" /pubsub /get_subscribed_messages get pubsub/get_sub_messages --response-type json
  bx wsk api create -n "RegisterSubscriber" /pubsub /register_subscriber get pubsub/register_subscriber --response-type json
  bx wsk api create -n "PublishStateless" /pubsub /publish_stateless post pubsub/publish_stateless --response-type json

  echo -e "${GREEN}Install Complete${NC}"
}

function uninstall() {
  echo -e "${RED}Uninstalling..."

  echo "Removing rules..."
  bx wsk rule disable broker-rule
  sleep 1
  bx wsk rule delete broker-rule

  echo "Removing triggers..."
  bx wsk trigger delete message-published

  echo "Removing Actions"
  bx wsk action delete pubsub/publish
  bx wsk action delete pubsub/last_read
  bx wsk action delete pubsub/subscribe
  bx wsk action delete pubsub/unsubscribe
  bx wsk action delete pubsub/broker
  bx wsk action delete pubsub/get_sub_topics
  bx wsk action delete pubsub/get_sub_messages
  bx wsk action delete pubsub/register_subscriber
  bx wsk action delete pubsub/publish_stateless

  echo "Removing Sequences"
  bx wsk action delete pubsub/broker-sequence

  echo "Removing packages..."
  bx wsk package delete "$CLOUDANT_INSTANCE"

  echo "Deleting API"
  bx wsk api delete /pubsub

  echo "Removing package..."
  bx wsk package delete pubsub

  echo -e "${GREEN}Uninstall Complete${NC}"
}

function login() {
  echo "Logging in to Bluemix"
  bx logout
  bx login -a $OPENWHISK_UK -o $OPENWHISK_ORG -s $OPENWHISK_SPACE --apikey $OPENWHISK_API_KEY
}

function reinstall() {
    login
    uninstall
    install
}

function showEnv() {
  echo -e "${YELLOW}Env Values"

  echo CLOUDANT_INSTANCE=$CLOUDANT_INSTANCE
  echo CLOUDANT_USERNAME=$CLOUDANT_USERNAME
  echo CLOUDANT_PASSWORD=$CLOUDANT_PASSWORD

  echo CLOUDANT_SUBSCRIBERS_DATABASE=$CLOUDANT_SUBSCRIBERS_DATABASE
  echo CLOUDANT_SUBSCRIBER_LOGS_DATABASE=$CLOUDANT_SUBSCRIBER_LOGS_DATABASE
  echo CLOUDANT_PUBLISHED_MESSAGES_DATABASE=$CLOUDANT_PUBLISHED_MESSAGES_DATABASE

  echo OPENWHISK_USER_NAME=$OPENWHISK_USER_NAME
  echo OPENWHISK_PASSWORD=$OPENWHISK_PASSWORD
  echo OPENWHISK_NAMESPACE=$OPENWHISK_NAMESPACE

  echo WATSON_IOT_ORG=$WATSON_IOT_ORG
  echo WATSON_IOT_APPLICATION_TYPE=$WATSON_IOT_APPLICATION_TYPE
  echo WATSON_IOT_API_USERNAME=$WATSON_IOT_API_USERNAME
  echo WATSON_IOT_API_PASSWORD=$WATSON_IOT_API_PASSWORD

  echo -e "${NC}"
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
"--env" )
showEnv
;;
* )
usage
;;
esac

# wsk api list -f
