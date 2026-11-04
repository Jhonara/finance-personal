# Build from the backend directory so Maven can resolve the wrapper and source tree.
FROM maven:3.9.12-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

COPY pom.xml ./
COPY .mvn .mvn
RUN mvn -B -Prender -DskipTests dependency:go-offline

COPY src src
RUN mvn -B -Prender -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=build --chown=spring:spring /workspace/target/finance-manager-backend-*.jar /app/app.jar

USER spring:spring
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -XX:MaxRAMPercentage=65.0 -XX:InitialRAMPercentage=20.0 -XX:ActiveProcessorCount=1 -Xss256k"

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
