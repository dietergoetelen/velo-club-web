FROM eclipse-temurin:21-jre-alpine

WORKDIR /graphhopper

ARG GH_VERSION=11.0
RUN wget -q -O graphhopper.jar \
    https://github.com/graphhopper/graphhopper/releases/download/${GH_VERSION}/graphhopper-web-${GH_VERSION}.jar

COPY config.yml .
COPY *.json .

# Persisted across restarts:
#   /graphhopper/data              — OSM PBF source (datareader.file)
#   /graphhopper/graphhopper-cache — built graph (graph.location, multi-GB,
#                                    ~25 min to rebuild, MMAP access)
VOLUME ["/graphhopper/data", "/graphhopper/graphhopper-cache"]

EXPOSE 8989 8990

CMD ["java", "-Xmx1500m", "-Xms256m", "-Dfile.encoding=UTF-8", \
     "-jar", "graphhopper.jar", "server", "config.yml"]
