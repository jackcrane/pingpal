FROM --platform=linux/amd64 node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev

COPY . .

ENV DATABASE_URL="postgresql://doadmin:AVNS_atgz7H8w0eZn8wpMgtR@pingpal-db-do-user-7960971-0.c.db.ondigitalocean.com:25061/cluster-host?sslmode=require&connection_limit=500&pool_timeout=2"
RUN yarn build_db
RUN yarn build_basicstatuspage

EXPOSE 2000
CMD [ "node", "serve.js" ]
