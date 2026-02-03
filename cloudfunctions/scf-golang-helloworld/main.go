package main

import (
	"context"
	"fmt"
	"time"

	"github.com/tencentyun/scf-go-lib/cloudfunction"
)

// Event 定义输入事件结构
type Event struct {
	Name    string `json:"name"`
	Message string `json:"message"`
}

// Response 定义响应结构
type Response struct {
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
	RequestID string `json:"requestId"`
}

// hello 是实际的入口函数 - 标准版本（带 context 和 event）
func hello(ctx context.Context, event Event) (Response, error) {
	fmt.Printf("Received event: %+v\n", event)
	fmt.Printf("Received context: %+v\n", ctx)
	fmt.Println("Hello world")

	// 获取请求ID（如果可用）
	requestID := ""
	if ctx.Value("requestId") != nil {
		requestID = ctx.Value("requestId").(string)
	}

	// 设置默认值
	name := event.Name
	if name == "" {
		name = "World"
	}
	
	message := event.Message
	if message == "" {
		message = "Hello"
	}

	response := Response{
		Message:   fmt.Sprintf("%s, %s!", message, name),
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		RequestID: requestID,
	}

	fmt.Printf("Response: %+v\n", response)
	return response, nil
}

// helloSimple 简单版本 - 只接收字符串
func helloSimple(name string) (string, error) {
	fmt.Printf("Received name: %s\n", name)
	
	if name == "" {
		name = "World"
	}
	
	result := fmt.Sprintf("Hello, %s!", name)
	fmt.Println(result)
	return result, nil
}

// helloNoParams 无参数版本
func helloNoParams() (string, error) {
	fmt.Println("Hello world - no parameters")
	return "Hello World!", nil
}

// helloContextOnly 只使用 context
func helloContextOnly(ctx context.Context) (string, error) {
	fmt.Printf("Received context: %+v\n", ctx)
	
	requestID := ""
	if ctx.Value("requestId") != nil {
		requestID = ctx.Value("requestId").(string)
	}
	
	result := fmt.Sprintf("Hello from context! RequestID: %s", requestID)
	fmt.Println(result)
	return result, nil
}

// main 函数用于启动服务
func main() {
	// Make the handler available for Remote Procedure Call by Cloud Function
	// 使用标准的 hello 函数作为入口
	cloudfunction.Start(hello)
	
	// 如果需要使用其他版本的函数，可以替换为：
	// cloudfunction.Start(helloSimple)
	// cloudfunction.Start(helloNoParams)
	// cloudfunction.Start(helloContextOnly)
}