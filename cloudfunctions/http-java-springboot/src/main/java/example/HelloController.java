package example;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * 示例控制器，提供健康检查、JSON 与回显接口。
 *
 * Sample controller exposing health, JSON and echo endpoints.
 */
@RestController
public class HelloController {

    @GetMapping("/")
    public Map<String, Object> hello() {
        Map<String, Object> body = new HashMap<>();
        body.put("message", "Hello World from Spring Boot!");
        body.put("timestamp", Instant.now().toString());
        return body;
    }

    @GetMapping("/json")
    public Map<String, Object> json() {
        Map<String, Object> data = new HashMap<>();
        data.put("a", 123);
        Map<String, Object> body = new HashMap<>();
        body.put("code", 200);
        body.put("data", data);
        return body;
    }

    @PostMapping("/echo")
    public Map<String, Object> echo(@RequestBody(required = false) Map<String, Object> requestBody) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", 200);
        body.put("requestBody", requestBody == null ? new HashMap<>() : requestBody);
        return body;
    }
}
