#!/bin/bash

# Color vars to be used in shell script output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

source local.env

function usage() {
  echo -e "${YELLOW}Usage: $0 [--install,--uninstall,--reinstall,--env]${NC}"
}

function install() {
  # Exit if any command fails
  set -e

  echo -e "${YELLOW}Installing OpenWhisk actions, triggers, and rules for check-deposit..."

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
  wsk action create pubsub/publish actions/publish.js --web true
  wsk action create pubsub/last_read actions/last-read-subscriber.js
  wsk action create pubsub/subscribe actions/subscribe.js --web true
  wsk action create pubsub/unsubscribe actions/unsubscribe.js --web true
  wsk action create pubsub/broker actions/broker.js
  wsk action create pubsub/get_sub_topics actions/get-subscribed-topics.js --web true

  echo "Creating sequence that ties published message read to broker action"
  wsk action create pubsub/broker-sequence \
    --sequence /_/$CLOUDANT_INSTANCE/read,pubsub/broker

  echo "Creating rule that maps published messages change trigger to broker sequence"
  wsk rule create broker-rule message-published pubsub/broker-sequence

  echo "Creating API"
  wsk api create -n "Publish" /pubsub /publish post pubsub/publish --response-type json
  wsk api create -n "Subscribe" /pubsub /subscribe post pubsub/subscribe --response-type json
  wsk api create -n "Unsubscribe" /pubsub /unsubscribe post pubsub/unsubscribe --response-type json

  echo -e "${GREEN}Install Complete${NC}"
}

function uninstall() {
  echo -e "${RED}Uninstalling..."

  echo "Removing rules..."
  wsk rule disable broker-rule
  sleep 1
  wsk rule delete broker-rule

  echo "Removing triggers..."
  wsk trigger delete message-published

  echo "Removing Actions"
  wsk action delete pubsub/publish
  wsk action delete pubsub/last_read
  wsk action delete pubsub/subscribe
  wsk action delete pubsub/unsubscribe
  wsk action delete pubsub/broker
  wsk action delete pubsub/get_sub_topics

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

  echo CLOUDANT_SUBSCRIBERS_DATABASE=$CLOUDANT_SUBSCRIBERS_DATABASE
  echo CLOUDANT_SUBSCRIBER_LOGS_DATABASE=$CLOUDANT_SUBSCRIBER_LOGS_DATABASE
  echo CLOUDANT_PUBLISHED_MESSAGES_DATABASE=$CLOUDANT_PUBLISHED_MESSAGES_DATABASE

  echo OPENWHISK_USER_NAME=$OPENWHISK_USER_NAME
  echo OPENWHISK_PASSWORD=$OPENWHISK_PASSWORD
  echo OPENWHISK_NAMESPACE=$OPENWHISK_NAMESPACE

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
