# AppFlowy Cloud Integration with CCF-Planner

## 🚀 Overview

This document describes the integration between AppFlowy Cloud (self-hosted) and the CCF Sermon Planner application. AppFlowy provides a powerful collaborative document and workspace management system that enhances the sermon planning experience.

## 🌐 Architecture

The integration runs AppFlowy Cloud locally on **port 6780** and provides:

- **Collaborative Editing**: Real-time collaborative sermon planning
- **Document Management**: Rich text editing with templates
- **User Management**: Multi-user support for church teams
- **AI Integration**: JinaAI for sermon enhancement
- **Data Synchronization**: Seamless sync between AppFlowy and CCF-planner

## 📋 Services

| Service | Port | Description |
|---------|------|-------------|
| AppFlowy Nginx | 6780 | Main entry point (reverse proxy) |
| AppFlowy Cloud | 8000 (internal) | Core AppFlowy API |
| Admin Console | 6780/console | User and workspace management |
| CCF Backend | 6781 | Sermon planner API |
| CCF Frontend | 6782 | Sermon planner UI |
| PostgreSQL | 5432 (internal) | Shared database |
| Redis | 6379 (internal) | Cache and sessions |
| MinIO | 9000 (internal) | Object storage |
| JinaAI Service | 6785 | AI enhancements |
| Vector DB | 6787 | AI embeddings storage |

## 🛠️ Installation

### Prerequisites

- Docker and Docker Compose installed
- Git installed
- Node.js 18+ (for CCF-planner)
- 8GB RAM minimum
- 10GB free disk space

### Quick Start

1. **Clone AppFlowy Cloud** (already done):
```bash
cd ~/Documents/Github
git clone https://github.com/AppFlowy-IO/AppFlowy-Cloud.git
```

2. **Configure Environment**:
```bash
cd AppFlowy-Cloud
cp deploy.env .env
# Edit .env to set NGINX_PORT=6780
```

3. **Start Services**:
```bash
# Using the integration script
./scripts/appflowy-integration.sh start

# Or manually with Docker
cd ~/Documents/Github/AppFlowy-Cloud
docker compose up -d
```

4. **Access Services**:
- Admin Console: http://localhost:6780/console
- Default Login: admin@example.com / password

## 🔧 Management Scripts

### AppFlowy Integration Script

Located at `scripts/appflowy-integration.sh`:

```bash
# Start AppFlowy services
./scripts/appflowy-integration.sh start

# Stop services
./scripts/appflowy-integration.sh stop

# Check status
./scripts/appflowy-integration.sh status

# View logs
./scripts/appflowy-integration.sh logs

# Health check
./scripts/appflowy-integration.sh health

# Reset all data (careful!)
./scripts/appflowy-integration.sh reset
```

## 🧪 Testing

### Running Playwright Tests

```bash
# Install dependencies
npm install

# Run AppFlowy integration tests
npm run test:appflowy

# Run with UI mode
npm run test:appflowy:ui

# Generate test report
npm run test:appflowy:report
```

### Test Coverage

The test suite covers:
- Admin console access
- User creation and management
- Workspace creation
- Document collaboration
- AI integration with JinaAI
- Performance benchmarks
- Offline mode handling

## 🤖 AI Integration

### JinaAI Features

1. **Sermon Enhancement**: Expand basic outlines into full sermons
2. **Scripture Analysis**: Deep dive into biblical passages
3. **Series Generation**: Create connected sermon series
4. **Semantic Search**: Find related sermons and resources

### Configuration

Add to your `.env` file:
```env
JINA_API_KEY=your_jina_api_key
BRAVE_SEARCH_KEY=your_brave_search_key
```

## 📝 User Workflows

### Creating a Sermon

1. Login to AppFlowy at http://localhost:6780/console
2. Create or select a workspace
3. Create a new document
4. Use the sermon template
5. Collaborate with team members
6. Export as PDF when complete

### Inviting Team Members

1. Login as admin
2. Navigate to Admin → Users
3. Create new user accounts
4. Navigate to Invite page
5. Add users to workspaces
6. Users receive workspace access

### Real-time Collaboration

1. Multiple users open same document
2. Changes sync in real-time
3. Cursor positions visible
4. Comments and suggestions supported

## 🔒 Security Considerations

### Default Credentials (MUST CHANGE!)

- Admin Email: admin@example.com
- Admin Password: password
- Database: postgres / password
- MinIO: minioadmin / minioadmin

### Production Recommendations

1. Change all default passwords
2. Use HTTPS with proper certificates
3. Enable firewall rules
4. Regular backups
5. Monitor access logs

## 🐛 Troubleshooting

### Port Conflicts

If port 6780 is already in use:
```bash
# Check what's using the port
lsof -i :6780

# Kill the process or change the port in .env
NGINX_PORT=6790
```

### Database Issues

```bash
# Check PostgreSQL logs
docker logs appflowy-cloud-postgres-1

# Reset database (data loss!)
cd ~/Documents/Github/AppFlowy-Cloud
docker compose down -v
docker compose up -d
```

### Service Not Starting

```bash
# Check all service status
docker compose ps

# Check specific service logs
docker logs appflowy-cloud-appflowy_cloud-1

# Restart specific service
docker compose restart appflowy_cloud
```

## 📊 Monitoring

### Health Checks

```bash
# Check all services
./scripts/appflowy-integration.sh health

# Manual checks
curl http://localhost:6780/console
curl http://localhost:6780/api/health
```

### Performance Monitoring

Access Grafana dashboard (if configured):
- URL: http://localhost:6789
- Login: admin / admin
- Dashboards: AppFlowy metrics, PostgreSQL, Redis

## 🔄 Data Backup

### Manual Backup

```bash
# Backup PostgreSQL
docker exec appflowy-cloud-postgres-1 pg_dumpall -U postgres > backup.sql

# Backup MinIO data
docker run --rm -v appflowy-cloud_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz /data
```

### Restore from Backup

```bash
# Restore PostgreSQL
cat backup.sql | docker exec -i appflowy-cloud-postgres-1 psql -U postgres

# Restore MinIO
docker run --rm -v appflowy-cloud_minio_data:/data -v $(pwd):/backup alpine tar xzf /backup/minio-backup.tar.gz -C /
```

## 📚 Additional Resources

- [AppFlowy Documentation](https://appflowy.com/docs)
- [AppFlowy GitHub](https://github.com/AppFlowy-IO/AppFlowy)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Playwright Testing](https://playwright.dev/)
- [JinaAI Documentation](https://docs.jina.ai/)

## 🤝 Support

For issues related to:
- AppFlowy Cloud: [GitHub Issues](https://github.com/AppFlowy-IO/AppFlowy-Cloud/issues)
- CCF-Planner: Create issue in this repository
- Integration: Check this documentation first

## 📄 License

- AppFlowy: AGPL-3.0
- CCF-Planner: [Your License]
- Integration Scripts: MIT