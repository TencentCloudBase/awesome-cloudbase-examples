package example;

/**
 * 参数定义类 - POJO 类型
 * 用于接收 JSON 格式的输入参数
 */
public class KeyValueClass {
    private String key1;
    private String key2;

    public String getKey1() {
        return this.key1;
    }

    public void setKey1(String key1) {
        this.key1 = key1;
    }

    public String getKey2() {
        return this.key2;
    }

    public void setKey2(String key2) {
        this.key2 = key2;
    }

    public KeyValueClass() {
    }
    
    public KeyValueClass(String key1, String key2) {
        this.key1 = key1;
        this.key2 = key2;
    }
    
    @Override
    public String toString() {
        return String.format("KeyValueClass{key1='%s', key2='%s'}", key1, key2);
    }
}