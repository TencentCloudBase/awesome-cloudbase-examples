package example;

/**
 * SCF Java HelloWorld 示例
 * 按照腾讯云官方文档规范编写
 */
public class Hello {
    
    /**
     * 主处理函数 - 使用自定义 POJO 类型
     * 执行方法配置：example.Hello::mainHandler
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
     */
    public String simpleHandler(String name) {
        System.out.println("Processing name: " + name);
        return "Hello, " + (name != null ? name : "World") + "!";
    }
    
    /**
     * 带 Context 的处理函数
     * 执行方法配置：example.Hello::contextHandler
     */
    public String contextHandler(String input, com.qcloud.scf.runtime.Context context) {
        System.out.println("Request ID: " + context.getRequestId());
        System.out.println("Input: " + input);
        
        return String.format("Hello from SCF! Input: %s, RequestId: %s", 
                           input != null ? input : "empty", 
                           context.getRequestId());
    }
}