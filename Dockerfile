FROM --platform=linux/amd64 node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev

COPY . .

ENV DATABASE_URL="mysql://apps:Guro6297@db.jackcrane.rocks:3306/pingpal&connection_limit=50"
RUN yarn build_db
RUN yarn build_basicstatuspage

EXPOSE 2000
CMD [ "node", "serve.js" ]
