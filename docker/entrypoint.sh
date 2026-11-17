#!/bin/sh
# Orison container entrypoint.
#
# Every container (web, queue, scheduler) prepares the storage volume. Only the
# web server (the `frankenphp` command) runs the migrations and compiles the
# views, so the workers should start after it is healthy.
set -eu

cd /app

if [ -z "${APP_KEY:-}" ]; then
    echo 'orison: APP_KEY is not set. Generate one with:' >&2
    echo '  echo "base64:$(openssl rand -base64 32)"' >&2
    exit 1
fi

# The storage volume may start empty (a fresh bind mount), so recreate the
# directories Laravel expects.
mkdir -p \
    storage/app/private \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    db="${DB_DATABASE:-/app/storage/database/database.sqlite}"
    mkdir -p "$(dirname "$db")"
    [ -f "$db" ] || touch "$db"
fi

if [ "${1:-}" = "frankenphp" ]; then
    if [ "${ORISON_MIGRATE:-true}" = "true" ]; then
        php artisan migrate --force --no-interaction
    fi
    php artisan view:cache --no-interaction
fi

exec "$@"
