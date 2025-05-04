# Step 1: Build the app
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Step 2: Serve the app using a lightweight static server
FROM node:18-alpine

WORKDIR /app

# Install `serve` globally
RUN npm install -g serve

# Copy build output from previous stage
COPY --from=build /app/dist ./dist

# Set environment variable for port (optional)
ENV PORT=3000

# Expose the port to the container runtime
EXPOSE 3000

# Start the production server
CMD ["serve", "-s", "dist", "-l", "3000"]

