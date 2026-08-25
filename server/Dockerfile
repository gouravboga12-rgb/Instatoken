# Production Dockerfile for Insta Token Backend (AWS ECS / Fargate)
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Start server
CMD ["node", "index.js"]
