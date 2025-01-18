FROM nginx:alpine
COPY . /usr/share/nginx/html
# Update default nginx config for frontend
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080