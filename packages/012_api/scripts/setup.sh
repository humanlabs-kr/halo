#!/bin/bash

# Check if queue exists before creating
if ! npx wrangler queues list | grep -q "receipto-dev-receipt-analysis"; then
    npx wrangler queues create receipto-dev-receipt-analysis
else
    echo "Queue 'receipto-dev-receipt-analysis' already exists, skipping creation"
fi

if ! npx wrangler queues list | grep -q "receipto-dev-synapse-upload"; then
    npx wrangler queues create receipto-dev-synapse-upload
else
    echo "Queue 'receipto-dev-synapse-upload' already exists, skipping creation"
fi

if ! npx wrangler queues list | grep -q "receipto-dev-fluence-ocr"; then
    npx wrangler queues create receipto-dev-fluence-ocr
else
    echo "Queue 'receipto-dev-fluence-ocr' already exists, skipping creation"
fi

# if ! npx wrangler queues list | grep -q "review-comment-gen"; then
#     npx wrangler queues create review-comment-gen
# else
#     echo "Queue 'review-comment-gen' already exists, skipping creation"
# fi

# if ! npx wrangler queues list | grep -q "sync-auth-data"; then
#     npx wrangler queues create sync-auth-data
# else
#     echo "Queue 'sync-auth-data' already exists, skipping creation"
# fi

# npx wrangler secrets-store secret create local \
#   --name 88-ai_openai_default \
#   --value <OPENAI_API_KEY> \
#   --scopes workers