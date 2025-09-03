# DigitalOcean Deployment Guide

This directory contains all the configuration files needed to deploy the CCF-Planner with AppFlowy Cloud to DigitalOcean.

## 📋 Prerequisites

1. **DigitalOcean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **DigitalOcean CLI**: Install `doctl` - [Installation Guide](https://docs.digitalocean.com/reference/doctl/how-to/install/)
3. **Docker & Docker Compose**: Required for building images
4. **Domain** (Optional): Custom domain or use DigitalOcean's temporary domain

## 🚀 Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)

App Platform is a fully managed Platform-as-a-Service (PaaS) that handles infrastructure, scaling, and security.

**Pros:**
- Automatic SSL/TLS certificates
- Built-in CI/CD from GitHub
- Auto-scaling capabilities
- Managed databases
- Zero-downtime deployments
- Built-in monitoring

**Cons:**
- Higher cost than Droplets
- Less control over infrastructure
- Limited customization options

**Estimated Cost:** $25-75/month (depending on resources)

### Option 2: DigitalOcean Droplet

Deploy to a virtual private server (VPS) with full control over the environment.

**Pros:**
- Full control over the server
- Lower cost for single instance
- More customization options
- Can run multiple apps

**Cons:**
- Manual SSL setup required
- Need to manage updates and security
- Manual scaling
- More maintenance required

**Estimated Cost:** $12-48/month (depending on droplet size)

## 🔧 Quick Start

### 1. Clone and Navigate

```bash
cd deploy/digitalocean
```

### 2. Configure Environment

```bash
cp .env.production.template .env.production
# Edit .env.production with your settings
```

### 3. Run Deployment Script

```bash
chmod +x deploy.sh
./deploy.sh
```

The interactive script will guide you through the deployment process.

## 📝 Configuration Files

### `.env.production.template`
Environment variables template. Copy to `.env.production` and update with your values:
- `DO_TEMP_DOMAIN`: Your assigned DigitalOcean domain (e.g., `your-app.ondigitalocean.app`)
- Database credentials
- API keys (JinaAI, Brave Search, etc.)
- Admin passwords

### `docker-compose.production.yml`
Production Docker Compose configuration with:
- All AppFlowy services
- CCF-Planner services
- Nginx reverse proxy
- SSL/TLS support via Certbot
- Health checks and restart policies

### `nginx/nginx.prod.conf`
Production Nginx configuration:
- Reverse proxy for all services
- SSL/TLS configuration (after setup)
- Rate limiting
- Security headers
- WebSocket support
- Static file caching

### `deploy.sh`
Automated deployment script with options for:
- App Platform deployment
- Droplet deployment
- SSL certificate setup
- Health checks
- Monitoring

## 🌐 Domain Configuration

### Using DigitalOcean's Temporary Domain

When you create an app in App Platform or set up a Droplet, DigitalOcean provides a temporary domain:
- App Platform: `your-app-name.ondigitalocean.app`
- Droplet: Use the IP address initially

### Adding a Custom Domain

1. **Add domain to DigitalOcean:**
   ```bash
   doctl compute domain create yourdomain.com
   ```

2. **Update nameservers** at your domain registrar:
   - ns1.digitalocean.com
   - ns2.digitalocean.com
   - ns3.digitalocean.com

3. **Create DNS records:**
   ```bash
   # For App Platform
   doctl compute domain records create yourdomain.com \
     --record-type CNAME --record-name @ --record-data your-app.ondigitalocean.app

   # For Droplet
   doctl compute domain records create yourdomain.com \
     --record-type A --record-name @ --record-data YOUR_DROPLET_IP
   ```

## 🔒 SSL/TLS Setup

### App Platform (Automatic)
SSL certificates are automatically provisioned and renewed by DigitalOcean.

### Droplet (Manual with Let's Encrypt)

Run the deployment script:
```bash
./deploy.sh --ssl
```

Or manually:
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Run Certbot
docker-compose exec nginx certbot certonly \
  --webroot -w /var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com

# Restart Nginx
docker-compose restart nginx
```

## 📊 Deployment Steps

### App Platform Deployment

1. **Configure GitHub repository** (if not already done):
   ```bash
   git remote add origin https://github.com/yourusername/CCF-planner.git
   git push -u origin main
   ```

2. **Run deployment:**
   ```bash
   ./deploy.sh --app-platform
   ```

3. **Monitor deployment:**
   ```bash
   doctl apps logs YOUR_APP_ID --follow
   ```

### Droplet Deployment

1. **Create a Droplet:**
   ```bash
   doctl compute droplet create ccf-planner \
     --region nyc1 \
     --image docker-20-04 \
     --size s-2vcpu-4gb \
     --ssh-keys YOUR_SSH_KEY_ID
   ```

2. **Get Droplet IP:**
   ```bash
   doctl compute droplet list
   ```

3. **Deploy:**
   ```bash
   ./deploy.sh --droplet
   ```

## 🏥 Health Checks

Run health checks after deployment:
```bash
./deploy.sh --health
```

This checks:
- Main application endpoint
- Admin console accessibility
- API responsiveness
- Database connectivity

## 📈 Monitoring

### App Platform
Built-in monitoring in DigitalOcean dashboard:
- Resource usage
- Request metrics
- Error rates
- Deployment history

### Droplet
Set up monitoring:
```bash
# Install monitoring agent on droplet
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
```

View logs:
```bash
./deploy.sh --monitor
```

## 🔧 Post-Deployment Tasks

1. **Change default passwords:**
   - Admin console: `admin@example.com` / `password`
   - Update in `.env.production` and redeploy

2. **Configure email (SMTP):**
   - Set up SendGrid or another SMTP service
   - Update SMTP settings in `.env.production`

3. **Set up backups:**
   ```bash
   # For App Platform databases
   doctl databases backups list YOUR_DB_ID
   
   # For Droplet
   doctl compute droplet-action snapshot YOUR_DROPLET_ID
   ```

4. **Configure monitoring alerts:**
   - Set up in DigitalOcean dashboard
   - Configure email/Slack notifications

## 🐛 Troubleshooting

### App Won't Start
```bash
# Check logs
doctl apps logs YOUR_APP_ID

# Check environment variables
doctl apps config get YOUR_APP_ID
```

### Database Connection Issues
```bash
# Test database connection
doctl databases connection YOUR_DB_ID

# Check firewall rules
doctl databases firewalls list YOUR_DB_ID
```

### SSL Certificate Issues
```bash
# Renew certificates manually
docker-compose exec nginx certbot renew

# Check certificate status
docker-compose exec nginx certbot certificates
```

### High Memory Usage
```bash
# Check container stats
docker stats

# Restart services
docker-compose restart
```

## 💰 Cost Optimization

### Tips to Reduce Costs:
1. **Use managed databases** only for production data
2. **Implement caching** with Redis
3. **Use DigitalOcean Spaces** instead of MinIO for object storage
4. **Enable auto-scaling** only when needed
5. **Use smaller instances** for development/staging

### Estimated Monthly Costs:
- **Minimal Setup** (1 Droplet): ~$12-24/month
- **Standard Setup** (App Platform): ~$50-100/month
- **Production Setup** (with managed services): ~$150-300/month

## 📚 Additional Resources

- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [DigitalOcean Droplets Guide](https://docs.digitalocean.com/products/droplets/)
- [DigitalOcean Managed Databases](https://docs.digitalocean.com/products/databases/)
- [DigitalOcean Spaces (Object Storage)](https://docs.digitalocean.com/products/spaces/)
- [AppFlowy Self-Hosting Guide](https://appflowy.com/docs/self-host)

## 🆘 Support

For deployment issues:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review logs: `./deploy.sh --monitor`
3. Open an issue in the repository
4. Contact DigitalOcean support for infrastructure issues

## 📄 License

This deployment configuration is part of the CCF-Planner project.