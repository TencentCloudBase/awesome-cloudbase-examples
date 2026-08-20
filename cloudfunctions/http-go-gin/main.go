// 使用 Gin 框架的最小化 HTTP 函数模板
// Minimal HTTP function template powered by the Gin framework
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	r := gin.Default()

	// 健康检查 / Health check
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message":   "Hello World from Gin!",
			"method":    c.Request.Method,
			"path":      c.Request.URL.Path,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// 示例 JSON 路由 / Sample JSON route
	r.GET("/json", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 200,
			"data": gin.H{"a": 123},
		})
	})

	// 回显请求体 / Echo route
	r.POST("/echo", func(c *gin.Context) {
		var body map[string]any
		_ = c.ShouldBindJSON(&body)
		c.JSON(http.StatusOK, gin.H{
			"code":        200,
			"requestBody": body,
		})
	})

	log.Printf("http-go-gin listening on 0.0.0.0:%s", port)
	if err := r.Run("0.0.0.0:" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
