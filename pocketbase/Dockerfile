FROM alpine:3.19

ARG PB_VERSION=0.37.5

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip

RUN apk add --no-cache unzip ca-certificates \
  && unzip /tmp/pb.zip -d /pb/ \
  && rm /tmp/pb.zip

COPY data/pb_migrations/ /pb/pb_migrations/

EXPOSE 8090

VOLUME /pb/pb_data

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--automigrate"]
