# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force && \
    npm install && \
    npm install @vitejs/plugin-vue @vue/compiler-sfc --save-dev

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html
COPY conf/default.conf /etc/nginx/conf.d/default.conf

# Add SSL configuration
RUN mkdir -p /etc/nginx/ssl
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=XX/ST=StateName/L=CityName/O=CompanyName/OU=CompanySectionName/CN=localhost"

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]