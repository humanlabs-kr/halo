#!/bin/bash

# Script to run wrangler secret bulk in all package directories
# Usage: ./deploy.sh

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the packages directory (parent of scripts directory, then parent to get to packages)
PACKAGES_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
# Get the project root (parent of packages directory)
PROJECT_ROOT="$(dirname "$PACKAGES_DIR")"

echo "🚀 Starting wrangler secret bulk deployment for all packages..."
echo "Project root: $PROJECT_ROOT"
echo "Packages directory: $PACKAGES_DIR"
echo ""

# Counter for tracking progress
total_packages=0
successful_packages=0
failed_packages=0

# Array to store failed packages
failed_packages_list=()

# Loop through all direct child directories in packages
for package_dir in "$PACKAGES_DIR"/*; do
    if [ -d "$package_dir" ]; then
        package_name=$(basename "$package_dir")
        total_packages=$((total_packages + 1))
        
        echo "📦 Processing package: $package_name"
        echo "   Directory: $package_dir"
        
        # Check if .env.production.json exists in the package directory
        if [ -f "$package_dir/.env.production.json" ]; then
            echo "   ✅ Found .env.production.json"
            
            # Run wrangler secret bulk command
            if cd "$package_dir" && wrangler secret bulk .env.production.json --env production; then
                echo "   ✅ Successfully deployed secrets for $package_name"
                successful_packages=$((successful_packages + 1))
            else
                echo "   ❌ Failed to deploy secrets for $package_name"
                failed_packages=$((failed_packages + 1))
                failed_packages_list+=("$package_name")
            fi
        else
            echo "   ⚠️  No .env.production.json found, skipping $package_name"
        fi
        
        echo ""
    fi
done

# Print summary
echo "📊 Deployment Summary:"
echo "   Total packages: $total_packages"
echo "   Successful: $successful_packages"
echo "   Failed: $failed_packages"
echo "   Skipped: $((total_packages - successful_packages - failed_packages))"

if [ $failed_packages -gt 0 ]; then
    echo ""
    echo "❌ Failed packages:"
    for package in "${failed_packages_list[@]}"; do
        echo "   - $package"
    done
    echo ""
    echo "Please check the error messages above and fix any issues before retrying."
    exit 1
else
    echo ""
    echo "🎉 All packages processed successfully!"
    exit 0
fi
