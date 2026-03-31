#!/usr/bin/env bash
set -euo pipefail

echo "Running integration tests..."
dotnet test "Platform.AppHost.Tests/Platform.AppHost.Tests.csproj" \
  --logger "console;verbosity=detailed" \
  --filter "Category=Integration"
