FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app source code
COPY . .

# Fix permissions for node_modules binaries
RUN chmod +x node_modules/.bin/*

# Pass the env vars from Docker into the build
ARG VITE_CHATHUB_URL
ENV VITE_CHATHUB_URL=${VITE_CHATHUB_URL}

# Build the app for production (creates a 'dist' folder)
RUN npm run build

# Install a simple static server to serve the production build
RUN npm install -g serve

# Expose the port that the production server will listen on
EXPOSE 5173

# Serve the 'dist' folder on port 5173
CMD ["serve", "-s", "dist", "-l", "5173"]