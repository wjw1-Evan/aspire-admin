#!/usr/bin/env bash
set -euo pipefail

echo "Running unit tests: Platform.AppHost.Tests (Category=Unit)"
DOTNET_CMD="dotnet"

${DOTNET_CMD} test "Platform.AppHost.Tests/Platform.AppHost.Tests.csproj" \
  --logger "console;verbosity=detailed" \
  --filter "Category=Unit"

echo "Unit tests completed."
