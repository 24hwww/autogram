# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev deps) to have drizzle-kit available for push
# Alternatively, you could move drizzle-kit to specific dependencies
RUN npm install

# Copy source code for drizzle-kit
COPY shared ./shared
COPY drizzle.config.ts ./

# Copy the build artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# The app listens on port 5000 by default
EXPOSE 5000

# Use the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
