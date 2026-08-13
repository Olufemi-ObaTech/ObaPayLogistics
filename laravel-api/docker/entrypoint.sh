#!/bin/sh
set -e

php artisan config:cache

if [ "$SERVICE_ROLE" = "scheduler" ]; then
    # Durable customs-clearance sweep (routes/console.php) needs a
    # continuously-running scheduler process, not system cron, since it runs
    # on a sub-minute frequency.
    exec php artisan schedule:work
fi

# Web role (default): migrate on boot, then serve.
php artisan migrate --force
php artisan db:seed --force
exec php artisan serve --host 0.0.0.0 --port "${PORT:-8000}"
