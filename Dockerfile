FROM --platform=linux/amd64 node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev

COPY . .

ENV DATABASE_URL="mysql://apps:Guro6297@db.jackcrane.rocks:3306/pingpal"
RUN yarn build_db

EXPOSE 2000
CMD [ "node", "serve.js" ]
