#!/bin/sh
set -e

echo "--- AEGIS SYSTEM STARTUP ---"

# No database bootstrap hook is needed here; the app uses Firebase Data Connect at runtime.
echo "Launching web server on Port $PORT..."
export HOSTNAME="0.0.0.0"
exec node server.js
