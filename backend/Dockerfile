# Use a Node.js 18 Alpine image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and tsconfig.json to the working directory
COPY package.json tsconfig.json ./

# Install dependencies
# Use npm ci for clean installs in CI/CD and Docker builds
RUN npm ci

# Copy the source files
COPY src ./src

# Build the TypeScript code
RUN npm run build

# Command to run the application
# This will execute the compiled JavaScript file
CMD ["node", "dist/index.js"]

# Expose the port the app listens on (optional, but good practice)
EXPOSE 8080
