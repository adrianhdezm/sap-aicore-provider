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

# Read the current version from package.json
current_version=$(jq -r '.version' package.json)
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

# Update package.json with the new version
jq --arg new_version "$new_version" '.version = $new_version' package.json > tmp.$$.json && mv tmp.$$.json package.json

# Update package-lock.json with the new version if it exists
if [ -f package-lock.json ]; then
  jq --arg new_version "$new_version" '.version = $new_version' package-lock.json > tmp.$$.lock && mv tmp.$$.lock package-lock.json
fi

# Stage and commit the version bump
git add package.json package-lock.json
git commit -m "Bump version to $new_version"

# Push the commit and the tag to the remote repository (assuming main branch)
git push origin main
git push origin "v$current_version"
