# Step 1: Build the app
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Step 2: Serve the app using Express proxy server
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy build output and server files
COPY --from=build /app/dist ./dist
COPY server.js ./

# Set environment variable for port
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port to the container runtime
EXPOSE 3000

# Start the Express server with proxy
CMD ["node", "server.js"]

