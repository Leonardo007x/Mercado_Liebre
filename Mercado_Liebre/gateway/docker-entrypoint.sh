#!/bin/sh
set -e

node /opt/health-aggregator/health-aggregator.js &

exec nginx -g 'daemon off;'
