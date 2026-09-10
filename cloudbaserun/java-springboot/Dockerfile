# 使用官方 maven/Java 8 镜像作为构建环境
# https://hub.docker.com/_/maven
FROM maven:3.6-jdk-11 as builder

# 将代码复制到容器内
WORKDIR /app
COPY pom.xml .
COPY src ./src

# 构建项目
RUN mvn package -DskipTests

# 使用 AdoptOpenJDK 作为基础镜像
# https://hub.docker.com/r/adoptopenjdk/openjdk8
# https://docs.docker.com/develop/develop-images/multistage-build/#use-multi-stage-builds
FROM adoptopenjdk/openjdk11:alpine-slim

# 将 jar 放入容器内
COPY --from=builder /app/target/helloworld-*.jar /helloworld.jar

# 启动服务
CMD ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/helloworld.jar"]