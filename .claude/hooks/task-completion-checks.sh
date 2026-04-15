#!/bin/bash
# Runs lint, test, and build when an agent task completes.
# Exit code 2 = block completion and send feedback to the agent.
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

echo "Running post-task checks..." >&2

# Lint
if ! npm run lint 2>&1; then
  echo "Lint failed. Fix lint errors before completing this task." >&2
  exit 2
fi

# Test
if ! npm run test 2>&1; then
  echo "Tests failed. Fix failing tests before completing this task." >&2
  exit 2
fi

# Build plugin
if ! npm run build 2>&1; then
  echo "Build failed. Fix build errors before completing this task." >&2
  exit 2
fi

echo "All checks passed." >&2
exit 0
