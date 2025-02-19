# Use nginx alpine for smaller image size
FROM nginx:alpine

# Install certbot for SSL certificates
RUN apk add --no-cache --update openssl

# Create a directory to hold the certificate and key
RUN mkdir -p /etc/nginx/ssl

RUN  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key -out /etc/nginx/ssl/server.crt \
    -subj "/C=AE/ST=Abu Dhabi/L=Abu Dhabi/O=42/CN=localhost"

# Copy nginx configuration (path relative to build context)
COPY nginx/conf/nginx.conf /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /usr/share/nginx/static /usr/share/nginx/media

# Copy frontend files (paths are relative to the build context)
COPY frontend/ /usr/share/nginx/html/
COPY frontend/src/assets/ /usr/share/nginx/html/assets/

WORKDIR /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Default command
CMD ["nginx", "-g", "daemon off;"]