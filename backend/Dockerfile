# Install PHP dependencies without development tools.
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --no-dev --optimize --no-scripts

FROM php:8.4-cli-alpine
RUN apk add --no-cache postgresql-dev \
    && docker-php-ext-install pdo_pgsql
COPY docker/php.ini "$PHP_INI_DIR/conf.d/communityfix.ini"

WORKDIR /app
COPY --from=vendor /app /app

ENV PHP_CLI_SERVER_WORKERS=4
EXPOSE 10000
CMD ["sh", "docker/start.sh"]
