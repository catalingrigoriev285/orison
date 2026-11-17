# syntax=docker/dockerfile:1
#
# Orison production image: FrankenPHP (Caddy + PHP in one process) serving
# public/ on :8080, running as www-data. The same image runs the web server,
# the queue worker and the scheduler; only the command differs (see
# compose.yaml).
#
#   docker build -t orison .

ARG PHP_VERSION=8.4
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS node

# ---------------------------------------------------------------------------
# base: PHP runtime with the extensions Orison needs
# ---------------------------------------------------------------------------
FROM dunglas/frankenphp:1-php${PHP_VERSION} AS base

# pdo_sqlite, curl, mbstring and openssl are compiled into the base image.
RUN install-php-extensions \
        bcmath \
        intl \
        opcache \
        pcntl \
        pdo_mysql \
        pdo_pgsql \
        zip \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-orison.ini"

WORKDIR /app

# ---------------------------------------------------------------------------
# build-env: settings that let artisan boot during the build without a real
# database (AppServiceProvider reads settings from the DB on every boot).
# ---------------------------------------------------------------------------
FROM base AS build-env

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    DB_CONNECTION=sqlite \
    DB_DATABASE=/tmp/build.sqlite \
    CACHE_STORE=array \
    SESSION_DRIVER=array \
    QUEUE_CONNECTION=sync

RUN touch /tmp/build.sqlite

# ---------------------------------------------------------------------------
# vendor: Composer dependencies (no dev packages)
# ---------------------------------------------------------------------------
FROM build-env AS vendor

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist \
        --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --no-dev --optimize --no-interaction

# ---------------------------------------------------------------------------
# assets: Vite build. Wayfinder's Vite plugin calls `php artisan
# wayfinder:generate`, so this stage needs PHP and the vendor tree as well as
# Node.
# ---------------------------------------------------------------------------
FROM build-env AS assets

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm

COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY --from=vendor /app /app
RUN php artisan migrate --force --no-interaction \
    && npm run build

# ---------------------------------------------------------------------------
# app: the final image
# ---------------------------------------------------------------------------
FROM base AS app

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    DB_CONNECTION=sqlite \
    DB_DATABASE=/app/storage/database/database.sqlite \
    DB_JOURNAL_MODE=wal \
    DB_BUSY_TIMEOUT=5000 \
    DB_SYNCHRONOUS=normal \
    ORISON_PORT=8080

COPY --from=vendor /app /app
COPY --from=assets /app/public/build /app/public/build
COPY docker/Caddyfile /etc/orison/Caddyfile
COPY --chmod=0755 docker/entrypoint.sh /usr/local/bin/orison-entrypoint

# Code stays root-owned and read-only; www-data may write only to storage/
# (mounted as a volume), bootstrap/cache, and the Caddy and PsySH (tinker)
# dirs under XDG_DATA_HOME=/data and XDG_CONFIG_HOME=/config.
RUN rm -f /tmp/build.sqlite \
    && mkdir -p /data/caddy /config/caddy /data/psysh /config/psysh \
    && chown -R www-data:www-data storage bootstrap/cache \
        /data/caddy /config/caddy /data/psysh /config/psysh

USER www-data

# Routes and events are the same in every environment, so cache them now.
# Config is NOT cached: Orison applies settings stored in the database on top
# of config at boot, and a config cache would freeze them at build time.
RUN DB_DATABASE=:memory: CACHE_STORE=array php artisan route:cache \
    && DB_DATABASE=:memory: CACHE_STORE=array php artisan event:cache

VOLUME ["/app/storage"]
EXPOSE 8080

ENTRYPOINT ["orison-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/orison/Caddyfile"]
