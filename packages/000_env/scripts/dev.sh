#!/bin/bash

source .env

# run cloudflared tunnel for local development
cloudflared tunnel run --token $CLOUDFLARE_TUNNEL_TOKEN