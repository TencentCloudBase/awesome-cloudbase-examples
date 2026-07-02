package example;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

/**
 * 使用 JDK 内置 HttpServer 实现最小化 HTTP 函数示例。
 *
 * Minimal HTTP function example using the JDK built-in HttpServer.
 */
public class App {

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "9000"));
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/", new HelloHandler());
        server.setExecutor(null);
        System.out.printf("http-java-helloworld listening on 0.0.0.0:%d%n", port);
        server.start();
    }

    static class HelloHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String body = String.format(
                "{\"message\":\"Hello World from Java HTTP Function!\","
                    + "\"method\":\"%s\",\"path\":\"%s\",\"timestamp\":\"%s\"}",
                exchange.getRequestMethod(),
                exchange.getRequestURI().getPath(),
                Instant.now().toString()
            );
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }
}
