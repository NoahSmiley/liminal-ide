#!/bin/bash
# Runs the liminal server in a restart loop.
# The server exits gracefully on POST /api/restart, then this script rebuilds and restarts it.

cd "$(dirname "$0")"

while true; do
  echo "[run.sh] building..."
  cargo build 2>&1
  if [ $? -ne 0 ]; then
    echo "[run.sh] build failed, retrying in 3s..."
    sleep 3
    continue
  fi

  echo "[run.sh] starting server..."
  cargo run 2>&1
  EXIT_CODE=$?

  if [ $EXIT_CODE -ne 0 ]; then
    echo "[run.sh] server crashed (exit $EXIT_CODE), restarting in 1s..."
    sleep 1
  else
    echo "[run.sh] server exited cleanly, rebuilding and restarting..."
  fi
done
