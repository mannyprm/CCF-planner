# System Architecture — Cape Christian Sermon Planning (AppFlowy Edition)

> Role: **Architect** (Team Fullstack) — source of truth for service boundaries, interfaces, security, and deployment.  
> Scope: Align with `techstack.md` `https://appflowy.com/docs/Step-by-step-Self-Hosting-Guide---From-Zero-to-Production` and `CLAUDE.md choices and enforce Operate/Build` rules from `team-fullstack.txt`.

---

## 0) Executive Summary

A self-hosted, low‑ops sermon planning platform built on **AppFlowy Cloud** gh repo clone AppFlowy-IO/AppFlowy as the workspace engine, deployed on **DigitalOcean** with **PostgreSQL** (managed), **Nginx + Let’s Encrypt** for TLS, **DigitalOcean Spaces (S3-compatible)** for file assets/CDN, and **Firebase Auth** (Gmail SSO). **Docker Compose** is the baseline deployment; **Kubernetes** is optional for scale-out. **Redis** is an optional enhancement for caching and job queues.

---

## 1) Context & Capabilities

- **Primary Use Cases**
  - Annual → Series → Sermon planning
  - Collaborative editing (timelines, scriptures, topics, assets)
  - Exports: PDF, Excel, iCal, JSON
- **Non-Goals (MVP)**: Public API, offline-first, AI assistance (queued in roadmap).

### 1.1 Context Diagram (Mermaid)

```mermaid
flowchart LR
  Staff[Pastors / Marketing / Content / Volunteers] -- Web/App --> AFUI[AppFlowy Frontend]
  AFUI --> AFAPI[AppFlowy Cloud API]
  AFAPI --> PG[(PostgreSQL Managed)]
  AFAPI --> S3[(DO Spaces - S3)]
  AFAPI --> REDIS[(Redis - opt)]
  AFUI --> Firebase[(Firebase Auth - SSO)]
  subgraph Edge
    NGINX[Nginx + TLS]
  end
  Staff -- HTTPS --> NGINX -- reverse proxy --> AFUI & AFAPI
```

---

## 2) Component Architecture

### 2.1 Services
- **AppFlowy Cloud** (monorepo apps):  
  - *Frontend* (editable documents/boards/calendars)  
  - *Backend API* (workspace, blocks, permission checks, storage adaptors)
  - *Install gh repo clone AppFlowy-IO/AppFlowy
- **PostgreSQL (Managed)**: primary data store (users, workspaces, pages, blocks, metadata)
- **DigitalOcean Spaces (S3)**: uploaded assets (images, PDFs), CDN delivery
- **Firebase Auth**: identity provider (Google/Gmail SSO)
- **Redis (Optional)**: cache/session, background jobs (webhooks, export queues)
- **Nginx + Let’s Encrypt**: HTTPS termination, reverse proxy, HTTP/2, cache-control headers

### 2.2 Internal Modules (Logical)
- **Auth Gateway**: OIDC/OAuth handler with Firebase tokens → backend session
- **Workspace Engine**: CRUD for spaces/pages/blocks with optimistic locking
- **Bible API**: https://scripture.api.bible/
- **Collaborative Editing**: CRDT/OT (AppFlowy), version history, conflict resolution
- **Export Service**: server-side renderers (PDF/Excel/iCal/JSON)
- **Storage Adapter**: S3 client with presigned uploads, MIME checks, AV scan hook (future)
- **Audit & Telemetry**: structured logs, request IDs, metrics

### 2.3 Data Model (High Level)
- `users(id, email, name, auth_provider, roles[])`
- `workspaces(id, name, settings)`
- `pages(id, workspace_id, parent_page_id, type[annual|series|sermon|doc], metadata)`
- `blocks(id, page_id, block_type, content_json, position)`
- `assets(id, page_id, s3_key, content_type, size, checksum, created_by)`
- `events(id, page_id, starts_at, ends_at, kind[timeline|meeting|milestone])`
- `exports(id, page_id, type[pdf|xlsx|ics|json], status, location, created_by)`
- `audit(id, user_id, action, entity, entity_id, metadata, ts)`

---

## 3) Deployment Topologies

### 3.1 Docker Compose (Baseline)
**Why**: fastest time-to-value, simplest ops, easy rollbacks.

```
+ Droplet (Ubuntu 22.04+)
  - docker, docker compose, fail2ban, ufw
  - containers:
    - appflowy-frontend
    - appflowy-api
    - nginx (reverse proxy + certbot sidecar)
    - redis (optional)
  - managed services:
    - PostgreSQL (DigitalOcean Managed)
    - Spaces (S3)
    - Firebase Auth (external)
```

**Networking**
- `NGINX :443` → `frontend :3000` and `api :8080`
- egress to `*.digitaloceanspaces.com` and Firebase endpoints

### 3.2 Kubernetes (Scale-Out)
- **Ingress**: Nginx Ingress Controller
- **Workloads**: `Deployment` for frontend/api; `HPA` on CPU+RPS; `ConfigMap` for app config; `Secret` for keys
- **Storage**: external Postgres/Spaces; ephemeral container FS
- **Observability**: Prometheus, Grafana, Loki (optional)

---

## 4) Configuration & Environment

### 4.1 Required Environment Variables
```
# Core
APP_URL=https://sermons.example.org
NODE_ENV=production

# Database
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>

# Auth (Firebase)
AUTH_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=svc@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# S3 Storage (DigitalOcean Spaces)
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_BUCKET=cape-christian-sermons
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Optional
REDIS_URL=redis://redis:6379
EXPORT_TIMEOUT_MS=60000
MAX_UPLOAD_MB=25
```

### 4.2 Nginx (Sketch)
- `proxy_set_header X-Forwarded-Proto https`
- `proxy_read_timeout 90s`
- HTTP→HTTPS redirect, HSTS (preload optional), gzip/brotli, cache-control for static

---

## 5) Security Architecture

- **Identity**: Firebase (Google SSO), short-lived ID token; backend session with rotation
- **Authorization**: role-based; workspace-level + page/block ACLs
- **Secrets**: DO Secrets Manager or K8s `Secret`; never commit
- **Transport**: TLS 1.2+ (Let’s Encrypt), modern ciphers
- **Data**: at-rest encryption (DO Managed PG by default), S3 bucket private with presigned URLs
- **App Sec**: input validation, size limits, MIME checks; SSRF/XXE disabled; CSRF tokens for state‑changing routes
- **Audit**: log auth events, permission denials, admin actions; immutable storage (Loki/S3 lifecycle)
- **Backups**: daily PG snapshots + S3 versioning; 7/14/30 retention tiers
- **DR Plan**: recreate infra from IaC + restore DB snapshot + repoint DNS; RPO ≤ 24h, RTO ≤ 4h targets

---

## 6) Observability & SRE

- **Logging**: JSON logs; include `req_id`, `user_id`, `route`, `latency_ms`, `status`
- **Metrics**: request rate/error rate/latency (RED), DB connections, queue depth, export duration
- **Tracing**: optional OpenTelemetry (OTLP) to Grafana Tempo or Jaeger
- **Alerts** (examples):
  - API p95 latency > 750ms for 5m
  - 5xx error rate > 2% for 10m
  - DB CPU > 80% for 15m or connections > 80% of max
  - Disk > 80% on droplet
- **Dashboards**: RED overview, DB health, cache hit ratio, export service SLO

---

## 7) CI/CD

- **Branching**: trunk‑based with short‑lived feature branches
- **Checks**: lint, typecheck, unit tests, container build, SCA (e.g., Trivy/Grype)
- **Artifacts**: versioned Docker images `org/appflowy-api:{sha}` `org/appflowy-frontend:{sha}`
- **Promotion**: staging → production with manual approval
- **Migrations**: run on deploy; ensure idempotent/reversible
- **Secrets**: pulled at runtime; never in CI logs

---

## 8) Capacity Planning & Scale

- **Baseline**: 2 vCPU / 4GB droplet runs frontend+api comfortably for 50–100 concurrent users (guideline)  
- **Vertical Scale**: increase droplet size; PG managed tiers with read replicas as needed
- **Horizontal Scale** (K8s): HPA on CPU + RPS; sticky sessions not required (token-based); Redis used for coordination if needed
- **Heavy Workloads**: offload exports to background workers (queue) when p95 export time > 2s

---

## 9) Runbooks (Condensed)

### 9.1 High 5xx Rate
1. Check `kubectl logs` or `docker logs` for API errors  
2. Validate DB connectivity and connection pool saturation  
3. Roll back to last known-good image tag  
4. If memory pressure, increase container limits

### 9.2 Users Can’t Upload
1. Verify S3 credentials and bucket policy  
2. Check presign call; ensure correct `Content-Type` and CORS  
3. Validate max upload size in Nginx and API

### 9.3 Login Failures
1. Confirm Firebase project ID/keys and allowed domain  
2. Inspect token verification path; clock skew/time drift  
3. Review recent changes to callback URLs

---

## 10) Migration & Environment Strategy

- **Envs**: `dev` (local compose), `staging` (DO small droplet), `prod` (DO with backups/monitoring)
- **Infra as Code**: DO terraform (cluster, LB, DNS, spaces policy), K8s manifests or Helm
- **Data Migration**: schema migrations gated by feature flags; export/import for initial seed

---

## 11) Open Questions & Future Work

- **RBAC granularity** (ministry team scoping) — finalize role matrix
- **Background jobs** for exports (introduce workers + Redis/Sidekiq‑like pattern)
- **Public API** with scoped tokens and webhooks
- **Offline‑first** local sync and conflict resolution policies
- **AV Scanning** for uploads (clamd service) + DLP patterns

---

## 12) Appendix

### 12.1 Example docker‑compose.yml (sketch)
```yaml
version: "3.9"
services:
  api:
    image: org/appflowy-api:${TAG}
    env_file: .env
    ports: ["8080:8080"]
    depends_on: [redis]
  frontend:
    image: org/appflowy-frontend:${TAG}
    env_file: .env
    ports: ["3000:3000"]
  nginx:
    image: nginx:stable
    volumes:
      - ./ops/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ops/certs:/etc/letsencrypt
    ports: ["80:80","443:443"]
    depends_on: [api, frontend]
  redis:
    image: redis:7
    command: ["redis-server","--appendonly","yes"]
```

### 12.2 Minimal K8s Deploy (sketch)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: appflowy-api }
spec:
  replicas: 3
  selector: { matchLabels: { app: appflowy-api } }
  template:
    metadata: { labels: { app: appflowy-api } }
    spec:
      containers:
        - name: api
          image: org/appflowy-api:${TAG}
          envFrom: [{ secretRef: { name: app-secrets } }]
          resources: { requests: { cpu: "200m", memory: "256Mi" }, limits: { cpu: "1", memory: "1Gi" } }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: appflowy-api-hpa }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: appflowy-api }
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

---

**Author**: Architect (Team Fullstack) · **Status**: Draft · **Owner**: Engineering  
