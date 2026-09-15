# syntax=docker/dockerfile:1

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the React frontend and the Express server
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Only copy the dist folder containing the compiled frontend and server
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose port 3000
EXPOSE 3000

# Start the Node.js server
CMD ["node", "dist/server.cjs"]
