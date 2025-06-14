# Use the official Node.js 20 image as a base
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

ARG GITHUB_TOKEN
RUN echo "@solarspace-dev:registry=https://npm.pkg.github.com" >> .npmrc \
 && echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc \
 && npm ci \
 && rm .npmrc

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Build the frontend
RUN npm run build:frontend

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/index.js"]
