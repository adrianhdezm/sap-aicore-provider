#!/bin/bash
set -e

# Usage: ./release.sh [major|minor|patch]
release_type=${1:-patch}
if [[ "$release_type" != "major" && "$release_type" != "minor" && "$release_type" != "patch" ]]; then
  echo "Usage: $0 [major|minor|patch]"
  exit 1
fi

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed."
  exit 1
fi

# Package paths
PROVIDER_PKG="packages/sap-aicore-provider/package.json"
NANO_SDK_PKG="packages/sap-aicore-nano-sdk/package.json"

# Read the current version from provider package.json (source of truth)
current_version=$(jq -r '.version' "$PROVIDER_PKG")
if [ -z "$current_version" ]; then
  echo "Error: Unable to find version in package.json"
  exit 1
fi
echo "Current version: $current_version"

# Create a Git tag with the current version on the current commit
git tag "v$current_version"

# Split the current version into major, minor, and patch components
IFS='.' read -r major minor patch <<< "$current_version"

# Increment the version based on the release type
case "$release_type" in
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  patch)
    patch=$((patch + 1))
    ;;
esac

new_version="${major}.${minor}.${patch}"
echo "New version: $new_version"

# Update both package.json files with the new version
jq --arg new_version "$new_version" '.version = $new_version' "$PROVIDER_PKG" > tmp.$$.json && mv tmp.$$.json "$PROVIDER_PKG"
jq --arg new_version "$new_version" '.version = $new_version' "$NANO_SDK_PKG" > tmp.$$.json && mv tmp.$$.json "$NANO_SDK_PKG"

# Stage and commit the version bump
git add "$PROVIDER_PKG" "$NANO_SDK_PKG"
git commit -m "chore(release): 🔧 Bump version to $new_version"

# Push the commit and the tag to the remote repository (assuming main branch)
git push origin main
git push origin "v$current_version"
