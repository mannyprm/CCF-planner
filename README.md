# Cape Christian Sermon Planning System

A comprehensive sermon planning and management platform built with AppFlowy, React, Node.js, and PostgreSQL.

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/cape-christian/sermon-planner.git
   cd sermon-planner
   ```

2. **Run setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 📦 Project Structure

```
.
├── src/
│   ├── backend/        # Node.js API server
│   ├── frontend/       # React application
│   └── shared/         # Shared types and utilities
├── docs/               # Documentation
├── config/             # Configuration files
├── scripts/            # Utility scripts
├── docker-compose.yml  # Docker configuration
└── .env.example        # Environment template
```

## 🛠️ Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers

## 📚 Documentation

- [Implementation Plan](docs/implementation-plan.md)
- [API Documentation](docs/api/openapi.yaml)
- [Database Schema](docs/database/schema.sql)
- [Architecture Overview](architecture.md)

## 🔐 Security

- Firebase Authentication with Gmail SSO
- JWT-based API authentication
- Role-based access control
- Encrypted data at rest and in transit

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### DigitalOcean Deployment
See [Deployment Guide](docs/deployment.md)

## 📄 License

MIT License - Cape Christian Fellowship

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📞 Support

For support, email tech@capechristian.org
