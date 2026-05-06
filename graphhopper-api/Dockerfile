FROM eclipse-temurin:21-jre-alpine

WORKDIR /graphhopper

ARG GH_VERSION=11.0
RUN wget -q -O graphhopper.jar \
    https://github.com/graphhopper/graphhopper/releases/download/${GH_VERSION}/graphhopper-web-${GH_VERSION}.jar

COPY config.yml .
COPY *.json .

# /graphhopper/data is mounted as a volume — it holds the OSM PBF and the
# built graph cache so rebuilds survive container restarts.
VOLUME ["/graphhopper/data"]

EXPOSE 8989 8990

CMD ["java", "-Xmx1500m", "-Xms256m", "-Dfile.encoding=UTF-8", \
     "-jar", "graphhopper.jar", "server", "config.yml"]
