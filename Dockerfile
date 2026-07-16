FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application (Frontend + Backend)
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the Node.js compiled backend
CMD ["npm", "run", "start"]
