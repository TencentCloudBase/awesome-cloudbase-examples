package example;

/**
 * SCF Java HelloWorld 示例
 * 按照腾讯云官方文档规范编写
 *
 * SCF (Serverless Cloud Function) Java HelloWorld example.
 * Written according to the Tencent Cloud official documentation conventions.
 */
public class Hello {
    
    /**
     * 主处理函数 - 使用自定义 POJO 类型
     * 执行方法配置：example.Hello::mainHandler
     *
     * Main handler that uses a custom POJO as the input type.
     * Configure the runtime handler as: example.Hello::mainHandler
     */
    public String mainHandler(KeyValueClass kv) {
        System.out.println("Hello world!");
        System.out.println(String.format("key1 = %s", kv.getKey1()));
        System.out.println(String.format("key2 = %s", kv.getKey2()));
        return String.format("Hello World");
    }
    
    /**
     * 简单字符串处理函数
     * 执行方法配置：example.Hello::simpleHandler
     *
     * Simple handler that takes a single string as input.
     * Configure the runtime handler as: example.Hello::simpleHandler
     */
    public String simpleHandler(String name) {
        System.out.println("Processing name: " + name);
        return "Hello, " + (name != null ? name : "World") + "!";
    }
    
    /**
     * 带 Context 的处理函数
     * 执行方法配置：example.Hello::contextHandler
     *
     * Handler variant that receives the SCF runtime Context object.
     * Configure the runtime handler as: example.Hello::contextHandler
     */
    public String contextHandler(String input, com.qcloud.scf.runtime.Context context) {
        System.out.println("Request ID: " + context.getRequestId());
        System.out.println("Input: " + input);
        
        return String.format("Hello from SCF! Input: %s, RequestId: %s", 
                           input != null ? input : "empty", 
                           context.getRequestId());
    }
}