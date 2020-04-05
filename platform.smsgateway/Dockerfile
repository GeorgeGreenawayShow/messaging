FROM mhart/alpine-node

WORKDIR /service

COPY . .

RUN yarn install

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "index.js"]