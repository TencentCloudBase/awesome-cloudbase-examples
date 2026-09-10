# Go CloudBase Run Template

A minimal Go HTTP service example for CloudBase Run (container deployment).

## Project Structure

```
go-helloworld/
├── main.go          # Entry point: HTTP server on port 8080
├── go.mod           # Go module definition
├── Dockerfile       # Container build file
└── README*.md       # Documentation
```

## Quick Start

```bash
# Run locally
go run main.go
# Visit http://localhost:8080

# Or via Docker
docker build -t go-helloworld .
docker run -p 8080:8080 go-helloworld
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```
