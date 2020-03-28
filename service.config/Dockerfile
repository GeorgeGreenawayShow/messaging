FROM mhart/alpine-node

WORKDIR /service

COPY . .

RUN yarn install

CMD ["node", "index.js"]