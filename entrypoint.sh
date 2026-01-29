#!/bin/sh

# Wait for database to be ready (optional, but handled by docker-compose)
# Sync database with Prisma (client already generated during build)
echo "Syncing database with Prisma..."
npx prisma db push

# Start the application
echo "Starting application..."
npm start
