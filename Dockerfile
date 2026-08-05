FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove devDependencies
RUN npm ci --omit=dev

# Expose port (Railway provides PORT environment variable)
EXPOSE 3000

# Start server
CMD ["npm", "start"]
