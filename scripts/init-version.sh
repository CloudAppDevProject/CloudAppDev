#!/bin/bash

# Initialize Git Version Tagging
# This script initializes semantic versioning for the project by creating the first git tag.
# It should only be run once at project setup.
#
# Usage: ./scripts/init-version.sh [version]
# Example: ./scripts/init-version.sh 0.1.0

set -e

VERSION="${1:-0.1.0}"

# Validate version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Invalid version format: $VERSION"
    echo "Must be in format: X.Y.Z (e.g., 0.1.0)"
    exit 1
fi

# Check if tags already exist
EXISTING_TAGS=$(git tag | wc -l)
if [ "$EXISTING_TAGS" -gt 0 ]; then
    echo "❌ Git tags already exist. Existing tags:"
    git tag -l
    echo ""
    echo "To manually increment, use:"
    echo "  git tag v<major>.<minor>.<patch>"
    echo "  git push origin v<major>.<minor>.<patch>"
    exit 1
fi

# Create the initial tag
TAG="v${VERSION}"
echo "📝 Creating initial version tag: $TAG"
git tag -a "$TAG" -m "Initial release: Version $VERSION"

echo ""
echo "✅ Tag created successfully!"
echo ""
echo "📤 To push this tag to remote:"
echo "   git push origin $TAG"
echo ""
echo "ℹ️  After pushing, subsequent builds will automatically increment:"
echo "   • Master branch: patch version (0.1.0 → 0.1.1)"
echo "   • Develop branch: dev version (0.1.0-dev.42)"
echo ""
