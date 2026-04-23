# Build Stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy rest of the code
COPY . .

# Create media folders
RUN mkdir -p media/Peliculas media/Series media/Musica

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
