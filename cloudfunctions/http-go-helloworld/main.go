// 使用 Go 标准库 net/http 实现最小化 HTTP 函数示例
// Minimal HTTP function example using the Go standard library net/http
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type response struct {
	Message   string `json:"message"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Timestamp string `json:"timestamp"`
}

func handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	body := response{
		Message:   "Hello World from Go HTTP Function!",
		Method:    r.Method,
		Path:      r.URL.Path,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	_ = json.NewEncoder(w).Encode(body)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", handler)

	addr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("http-go-helloworld listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
