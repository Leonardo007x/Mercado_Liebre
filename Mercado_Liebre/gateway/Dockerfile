FROM node:20-alpine

RUN apk add --no-cache nginx

WORKDIR /opt/health-aggregator
COPY package.json health-aggregator.js ./
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY snippets/proxy-api.conf /etc/nginx/snippets/proxy-api.conf
COPY snippets/error-json.conf /etc/nginx/snippets/error-json.conf

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
