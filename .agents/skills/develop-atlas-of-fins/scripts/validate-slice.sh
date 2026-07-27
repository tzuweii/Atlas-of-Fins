#!/usr/bin/env bash

set -euo pipefail

level="focused"
case "${1:-}" in
  "") ;;
  --region) level="region" ;;
  --full) level="full" ;;
  *) echo "Usage: validate-slice.sh [--region|--full]" >&2; exit 2 ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" || ! -f "$repo_root/package.json" ]]; then
  echo "Run this script inside the Atlas of Fins Git repository." >&2
  exit 1
fi

package_name="$(node -p "require(process.argv[1]).name" "$repo_root/package.json")"
if [[ "$package_name" != "atlas-of-fins" ]]; then
  echo "Expected Atlas of Fins, found package: $package_name" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

echo "== Git and whitespace =="
git status --short --branch
git diff --check HEAD

echo "== Changed JavaScript syntax =="
changed_files=()
while IFS= read -r file; do
  [[ -n "$file" ]] && changed_files+=("$file")
done < <({ git diff --name-only --diff-filter=ACMR HEAD -- '*.js' '*.mjs'; git ls-files --others --exclude-standard -- '*.js' '*.mjs'; } | sort -u)

if (( ${#changed_files[@]} == 0 )); then
  echo "No changed JavaScript files."
else
  for file in "${changed_files[@]}"; do
    [[ -f "$file" ]] && node --check "$file"
  done
fi

echo "== Live document consistency =="
if [[ "$level" == "full" ]]; then
  node "$script_dir/check-doc-consistency.mjs" --root "$repo_root" --all-docs
else
  node "$script_dir/check-doc-consistency.mjs" --root "$repo_root"
fi

echo "== Unit regression =="
npm test

if [[ "$level" == "region" || "$level" == "full" ]]; then
  echo "== Chromium flow =="
  npm run test:browser:run
fi

if [[ "$level" == "full" ]]; then
  echo "== Chromium stress =="
  npm run test:browser:stress
fi

echo "Atlas of Fins ${level} validation passed."
