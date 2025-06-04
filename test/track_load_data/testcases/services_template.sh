#!/usr/bin/env bash

SERVICE=$1

if [ -z "$SERVICE" ]; then
  echo Provide service name
  exit 1
fi

for postfix in with_title without_title private not_exists; do
  cp template.json ${SERVICE}_${postfix}.json;
  echo "'${SERVICE}_${postfix}'",
done