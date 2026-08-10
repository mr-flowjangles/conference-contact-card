#!/usr/bin/env bash
# Build and deploy one person's card to robrose.info/card
# Usage: ./deploy.sh rob-rose
set -euo pipefail

SLUG="${1:-rob-rose}"
BUCKET="s3://aws-serverless-resume-prod/card/"
DISTRIBUTION="E1G5RMKV5G4GR7"
export AWS_PROFILE="${AWS_PROFILE:-rob}"

node build.js "data/${SLUG}.json"
aws s3 sync "dist/${SLUG}/" "$BUCKET"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/card/*" > /dev/null

echo "Deployed ${SLUG} → https://robrose.info/card/index.html"
