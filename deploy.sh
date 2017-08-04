#!/bin/bash

# Color vars to be used in shell script output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

source local.env

function usage() {
  echo -e "${YELLOW}Usage: $0 [--install,--uninstall,--update,--env]${NC}"
}

function install() {
  # Exit if any command fails
  set -e

  echo -e "${YELLOW}Installing OpenWhisk actions, triggers, and rules for check-deposit..."

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

  wsk action create publish actions/publish.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action create last_read actions/last-read-subscriber.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action create subscribe actions/subscribe.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action create unsubscribe actions/unsubscribe.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action create broker actions/broker.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  echo "Creating sequence that ties published message read to broker action"
  wsk action create broker-sequence \
    --sequence /_/$CLOUDANT_INSTANCE/read,broker

  echo "Creating rule that maps published messages change trigger to broker sequence"
  wsk rule create broker-rule message-published broker-sequence

  echo -e "${GREEN}Install Complete${NC}"
}

function updateActions() {
 echo -e "${YELLOW}Updating..."

 echo "Updating Actions"

  wsk action update publish actions/publish.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action update last_read actions/last-read-subscriber.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action update subscribe actions/subscribe.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action update unsubscribe actions/unsubscribe.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  wsk action update broker actions/broker.js \
    --param CLOUDANT_USERNAME "$CLOUDANT_USERNAME" \
    --param CLOUDANT_PASSWORD "$CLOUDANT_PASSWORD"

  echo -e "${GREEN}Update Complete${NC}"
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

  wsk action delete publish
  wsk action delete last_read
  wsk action delete subscribe
  wsk action delete unsubscribe
  wsk action delete broker
  wsk action delete broker-sequence

  echo "Removing packages..."
  wsk package delete "$CLOUDANT_INSTANCE"

  echo -e "${GREEN}Uninstall Complete${NC}"
}

function showEnv() {
  echo -e "${YELLOW}Env Values"

  echo CLOUDANT_INSTANCE=$CLOUDANT_INSTANCE
  echo CLOUDANT_USERNAME=$CLOUDANT_USERNAME
  echo CLOUDANT_PASSWORD=$CLOUDANT_PASSWORD

  echo CLOUDANT_SUBSCRIBERS_DATABASE=$CLOUDANT_SUBSCRIBERS_DATABASE
  echo CLOUDANT_SUBSCRIBER_LOGS_DATABASE=$CLOUDANT_SUBSCRIBER_LOGS_DATABASE
  echo CLOUDANT_PUBLISHED_MESSAGES_DATABASE=$CLOUDANT_PUBLISHED_MESSAGES_DATABASE

  echo -e "${NC}"
}


case "$1" in
"--install" )
install
;;
"--update" )
updateActions
;;
"--uninstall" )
uninstall
;;
"--env" )
showEnv
;;
* )
usage
;;
esac