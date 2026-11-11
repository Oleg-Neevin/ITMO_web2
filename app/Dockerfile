FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /a
COPY libs libs
RUN mvn -q install:install-file -Dfile=libs/fastcgi-lib.jar -DgroupId=com.fastcgi -DartifactId=fastcgi-lib -Dversion=1.0 -Dpackaging=jar
COPY pom.xml .
COPY src src
RUN mvn -q package

FROM eclipse-temurin:17-jre
COPY --from=build /a/target/app.jar /app.jar
CMD ["java", "-DFCGI_PORT=9000", "-jar", "/app.jar"]