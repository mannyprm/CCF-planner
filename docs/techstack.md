
# TechStack
## AppFlowy Licensing & Hosting

**License**: AGPLv3 (GNU Affero General Public License)
- ✅ Free to use, modify, and self-host
- ✅ Perfect for your church's internal use
- ✅ No licensing fees or restrictions
- ⚠️ Only consideration: If you modify and offer it as a service to others, you'd need to share source code

**Source Code**: Fully available on GitHub
- Backend: https://github.com/AppFlowy-IO/AppFlowy-Cloud
- Frontend: https://github.com/AppFlowy-IO/AppFlowy

## Digital Ocean Deployment Strategy

### Budget Setup ($20-30/month)

```yaml
Minimal Environment:
  Single Droplet:
    - 2GB RAM, 1 vCPU ($12-18/month)
    - PostgreSQL on same server
    - Local file storage
    
  Backups:
    - DO Snapshots: $2/month
```

## Deployment Steps for Digital Ocean

### 1. Quick Deploy with Docker (Easiest)

```bash
# On your Digital Ocean droplet
git clone https://github.com/AppFlowy-IO/AppFlowy-Cloud
cd AppFlowy-Cloud

# Use their Docker Compose setup
docker-compose up -d

# Configure environment variables
cp .env.example .env
nano .env  # Add your settings
```

### 2. Production Deploy with Kubernetes (Scalable)

```yaml
# AppFlowy provides Kubernetes manifests
# Deploy to DO Kubernetes cluster
doctl kubernetes cluster kubeconfig save your-cluster
kubectl apply -f deploy/kubernetes/
```

### 3. Manual Installation

```bash
# Install dependencies
sudo apt update
sudo apt install postgresql redis nginx certbot

# Clone and build
git clone https://github.com/AppFlowy-IO/AppFlowy-Cloud
cd AppFlowy-Cloud
cargo build --release

# Setup systemd service
sudo cp appflowy.service /etc/systemd/system/
sudo systemctl enable appflowy
sudo systemctl start appflowy
```

## Digital Ocean Specific Advantages

**1-Click PostgreSQL**
- Managed database with automatic backups
- No maintenance overhead
- Point-in-time recovery

**Spaces for Storage**
- S3-compatible API
- CDN included
- Unlimited bandwidth

**Easy Scaling**
- Resize droplets without downtime
- Add read replicas for database
- Horizontal scaling with load balancers

## Configuration for Your Church

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/appflowy

# Authentication - Firebase Integration
AUTH_PROVIDER=firebase
FIREBASE_PROJECT_ID=cape-christian-fellowship
FIREBASE_PRIVATE_KEY=your-key

# Storage
S3_BUCKET=cape-christian-sermons
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_ACCESS_KEY=your-do-spaces-key
S3_SECRET_KEY=your-do-spaces-secret

# Custom Domain
APP_URL=temporary domain from Digital Ocean

## Cost Comparison

| Hosting Option | Monthly Cost | Pros | Cons |
|---------------|--------------|------|------|
| **Digital Ocean (Self-host)** | $48-96 | Full control, data ownership, customizable | You maintain it |
| **AppFlowy Cloud** | $0-15/user | Zero maintenance, automatic updates | Less control, data on their servers |
| **AWS/Azure** | $75-150 | Enterprise features | More complex, expensive |

## Monitoring & Maintenance

```bash
# Setup monitoring
doctl monitoring alert create \
  --name "AppFlowy Health" \
  --type "v1/insights/droplet/cpu" \
  --threshold 80

# Automated backups
doctl databases backups list <db-id>

# SSL with Let's Encrypt
certbot --nginx -d temporary domain from Digital Ocean
```

## My Recommendation

For Cape Christian Fellowship, I'd suggest:

1. **Start with a $48/month setup** on Digital Ocean:
   - 4GB Droplet + Managed PostgreSQL
   - This handles 50-100 concurrent users easily
   
2. **Use Docker deployment** for simplicity:
   - Easier updates
   - Consistent environment
   - Simple rollbacks

3. **Add DO Spaces** for file storage:
   - Sermon recordings, PDFs, images
   - CDN speeds up content delivery

4. **Set up daily backups**:
   - Database snapshots
   - Spaces versioning
   - Droplet snapshots weekly

## Quick Start Script

I can provide you with a complete deployment script that:
- Provisions the Digital Ocean infrastructure
- Deploys AppFlowy
- Configures SSL and domain
- Sets up automated backups
- Integrates Firebase auth

Would you like me to create this deployment automation for you? It would get you from zero to fully running in about 30 minutes.

The beautiful thing about this approach is you own everything - your data stays on your servers, you can customize anything, and there are no surprise fees or vendor lock-in. Plus, with Digital Ocean's dashboard, your team can easily monitor and manage the system without deep technical knowledge.