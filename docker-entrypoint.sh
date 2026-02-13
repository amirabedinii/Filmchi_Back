#!/bin/sh
set -e

echo "Waiting for PostgreSQL and running migrations..."
max_attempts=15
attempt=1

while [ $attempt -le $max_attempts ]; do
  if yarn migration:run:prod 2>/dev/null; then
    echo "Migrations completed successfully"
    break
  fi
  if [ $attempt -eq $max_attempts ]; then
    echo "Failed to run migrations after $max_attempts attempts"
    exit 1
  fi
  echo "Migration attempt $attempt failed, retrying in 3 seconds..."
  sleep 3
  attempt=$((attempt + 1))
done

echo "Starting application..."
exec node dist/main.js
