#!/usr/bin/env bash
# Build and deploy one person's card to robrose.info/card
# Usage: ./deploy.sh rob-rose
set -euo pipefail

SLUG="${1:-rob-rose}"
BUCKET="s3://aws-serverless-resume-prod/card/"
DISTRIBUTION="E1G5RMKV5G4GR7"
export AWS_PROFILE="${AWS_PROFILE:-rob}"

node build.js "data/${SLUG}.json"

# pass/ is the unzipped staging bundle — the .pkpass is the only shippable form
aws s3 sync "dist/${SLUG}/" "$BUCKET" --exclude "pass/*" --exclude "*.pkpass"

# Wallet only opens the pass if it's served with Apple's MIME type; s3 sync
# guesses application/octet-stream, which downloads as a dead file instead.
if [ -f "dist/${SLUG}/${SLUG}.pkpass" ]; then
  aws s3 cp "dist/${SLUG}/${SLUG}.pkpass" "${BUCKET}${SLUG}.pkpass" \
    --content-type application/vnd.apple.pkpass
fi

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/card/*" > /dev/null

echo "Deployed ${SLUG} → https://robrose.info/card/index.html"
