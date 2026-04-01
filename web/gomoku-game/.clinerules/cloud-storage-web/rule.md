---
name: cloud-storage-web
description: Complete guide for CloudBase cloud storage using Web SDK (@cloudbase/js-sdk) - upload, download, temporary URLs, file management, and best practices.
alwaysApply: false
---

# Cloud Storage Web SDK

## Activation Contract

### Use this first when

- A browser or Web app must upload, download, or manage CloudBase storage objects through `@cloudbase/js-sdk`.
- The request mentions `uploadFile`, `getTempFileURL`, `deleteFile`, or `downloadFile` in frontend code.

### Read before writing code if

- The task is browser-side storage work but you still need to separate it from Mini Program storage, backend storage management, or static hosting deployment.
- The request may be blocked by security domains or frontend auth.

### Then also read

- Web login and identity -> `../auth-web/SKILL.md`
- General Web app setup -> `../web-development/SKILL.md`
- Direct storage management through MCP tools -> `../cloudbase-platform/SKILL.md`

### Do NOT use for

- Mini Program file APIs.
- Backend or agent-side direct storage management through MCP.
- Static website hosting deployment via `uploadFiles`.
- Database operations.

### Common mistakes / gotchas

- Uploading from browser code without configuring security domains.
- Using this skill for static hosting instead of storage objects.
- Mixing browser SDK upload flows with server-side file-management tasks.
- Assuming temporary download URLs are permanent links.

### Minimal checklist

- Confirm the caller is a browser/Web app.
- Initialize the Web SDK once.
- Check security-domain/CORS requirements.
- Pick the right storage method before coding.

## Overview

Use this skill for **browser-side cloud storage operations** through the CloudBase Web SDK.

Typical tasks:

- upload files from a browser
- generate temporary download URLs
- delete files
- trigger browser downloads

## SDK initialization

```javascript
import cloudbase from "@cloudbase/js-sdk";

const app = cloudbase.init({
  env: "your-env-id"
});
```

Initialization rules:

- Use synchronous initialization with a shared app instance.
- Do not re-initialize in every component.
- If the operation depends on user identity, handle auth before storage operations.

## Method routing

- Upload from browser -> `app.uploadFile()`
- Temporary preview/download URL -> `app.getTempFileURL()`
- Delete existing files -> `app.deleteFile()`
- Trigger browser download -> `app.downloadFile()`

## Upload

```javascript
const result = await app.uploadFile({
  cloudPath: "uploads/avatar.jpg",
  filePath: selectedFile
});
```

### Upload rules

- `cloudPath` must include the filename.
- Use `/` to create folder structure.
- Validate file type and size before upload.
- Show upload progress for larger files when UX matters.

### Progress example

```javascript
await app.uploadFile({
  cloudPath: "uploads/avatar.jpg",
  filePath: selectedFile,
  onUploadProgress: ({ loaded, total }) => {
    const percent = Math.round((loaded * 100) / total);
    console.log(percent);
  }
});
```

## Temporary URLs

```javascript
const result = await app.getTempFileURL({
  fileList: [
    {
      fileID: "cloud://env-id/uploads/avatar.jpg",
      maxAge: 3600
    }
  ]
});
```

Use temp URLs when the browser needs to preview or download private files without exposing a permanent public link.

## Delete files

```javascript
await app.deleteFile({
  fileList: ["cloud://env-id/uploads/old-avatar.jpg"]
});
```

Always inspect per-file results before assuming deletion succeeded.

## Download files

```javascript
await app.downloadFile({
  fileID: "cloud://env-id/uploads/report.pdf"
});
```

Use this for browser-initiated downloads. For programmatic rendering or preview, prefer `getTempFileURL()`.

## Security-domain reminder

To avoid CORS problems, add your frontend domain in CloudBase console security domains.

Typical examples:

- `http://localhost:3000`
- `https://your-app.com`

## Best practices

1. Use a clear folder structure such as `uploads/`, `avatars/`, `documents/`.
2. Validate file size and type in the browser before upload.
3. Use temporary URLs with reasonable expiration windows.
4. Clean up obsolete files instead of leaving orphaned storage objects.
5. Route privileged batch-management tasks to backend or MCP flows instead of browser direct access.

## Error handling

```javascript
try {
  const result = await app.uploadFile({
    cloudPath: "uploads/file.jpg",
    filePath: selectedFile
  });
  console.log(result.fileID);
} catch (error) {
  console.error("Storage operation failed:", error);
}
```
