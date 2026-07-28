# VPC and non-native TCP database access (cloud functions)

## When this applies

Use this only when the Event Function or HTTP Function uses a **classic TCP client** to reach MySQL / PostgreSQL / Redis / MongoDB (for example `DATABASE_URL`, `mysql2`, `pg`, Prisma, TypeORM, Sequelize).

**Does NOT apply** when the function uses CloudBase native SDK surfaces only:

- Document DB: `app.database()` / `db.collection(...)`
- CloudBase PG: `app.rdb()` / HTTP API gateway paths documented for CloudBase PG

Native SDK access is platform-managed and does **not** require function VPC binding for typical CloudBase DB usage.

## Required config for TCP / non-native SDK

| Field | Meaning |
| --- | --- |
| `envVariables.DATABASE_URL` (or `MYSQL_*` / `PG*` / `REDIS_*`) | Connection string / host for the **private** DB endpoint |
| `vpc.vpcId` | Real VPC ID of that database (same region) |
| `vpc.subnetId` | Real subnet ID in that VPC with free IPs |

Event Functions and HTTP Functions share the same SCF networking model: both need `vpc` for private TCP access.

Official MySQL integration docs require enabling 私有网络 on the function and selecting the DB VPC: [Configure network connection](https://docs.cloudbase.net/cloud-function/resource-integration/mysql).

## Do not guess VPC IDs

Agents must **not**:

- Invent `vpc-xxxxx` / `subnet-xxxxx` placeholders
- Copy sample IDs from docs into a real deploy
- Assume “same environment” implies a default VPC without reading a real source

Resolve IDs from one of:

1. Database console / CloudBase MySQL settings (intranet VPC + subnet)
2. An existing resource that already works in that VPC (`queryFunctions getFunctionDetail`, CloudRun detail, CVM, etc.)
3. `callCloudApi` VPC/subnet describe APIs after confirming action names from docs
4. The user (ask and wait)

If IDs are still unknown after those steps: **stop**, report the gap, and do not deploy TCP DB env vars as if connectivity were solved.

## MCP usage

```javascript
await manageFunctions({
  action: "createFunction", // or updateFunctionConfig
  func: {
    name: "api",
    type: "HTTP", // or Event — same VPC rule
    envVariables: {
      DATABASE_URL: "postgres://user:pass@10.x.x.x:5432/app"
    },
    vpc: {
      vpcId: "<real-vpc-id>",
      subnetId: "<real-subnet-id>"
    }
  },
  functionRootPath: "/abs/path/to/cloudfunctions"
});
```

After create/update, call `queryFunctions(action="getFunctionDetail")` and verify `VpcConfig.VpcId` / `SubnetId`. Do not treat create/update success alone as proof that private TCP DB access works.

## Side effects of enabling VPC

After VPC is bound, public internet egress may require NAT / public gateway in that VPC. Prefer fixing that network path over removing VPC just to “make outbound work” when the DB is private.
