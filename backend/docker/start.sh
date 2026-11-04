#!/bin/sh
set -e

php artisan package:discover
php artisan config:cache
php artisan route:cache
php artisan migrate --force

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}" --no-reload
