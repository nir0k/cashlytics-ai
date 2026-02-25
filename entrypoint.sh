#!/bin/sh
set -e

echo "Running database migrations..."

# Run migrations with retry logic
max_retries=5
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if /migrate/node_modules/.bin/drizzle-kit migrate --config /migrate/drizzle.config.js; then
        echo "Migrations completed successfully."
        break
    else
        retry_count=$((retry_count + 1))
        echo "Migration attempt $retry_count failed, retrying in 3 seconds..."
        sleep 3
    fi
done

if [ $retry_count -eq $max_retries ]; then
    echo "Warning: Migrations failed after $max_retries attempts. Starting app anyway..."
fi

exec node /app/server.js
