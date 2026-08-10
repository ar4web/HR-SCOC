#!/bin/sh
set -e
# Ensure the data volume is writable by the non-root nextjs user
if [ -d /app/data ]; then
  chown -R nextjs:nodejs /app/data 2>/dev/null || true
fi
exec "$@"