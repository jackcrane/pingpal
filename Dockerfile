FROM --platform=linux/amd64 node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev

COPY . .

ENV DATABASE_URL="postgresql://apps:fJaDhGKuGTuFXc7yURy0KQ@pingpal-production-15362.7tt.aws-us-east-1.cockroachlabs.cloud:26257/pingpal-primary?sslmode=verify-full&connection_limit=100"
RUN yarn build_db
RUN yarn build_basicstatuspage
RUN yarn build:landing

EXPOSE 2000
CMD [ "node", "serve.js" ]
