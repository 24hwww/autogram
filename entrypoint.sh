#!/bin/sh

# Wait for database to be ready (optional, but handled by docker-compose)
# Run database migrations/push
echo "Running database push..."
npx drizzle-kit push

# Start the application
echo "Starting application..."
npm start
