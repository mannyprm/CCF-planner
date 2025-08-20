Operating Instructions:
Product Requirements Document (PRD)

Cape Christian Fellowship — Sermon Planning System

⸻

1. Overview

A self-hosted sermon planning and management platform for Cape Christian, built on the AppFlowy Cloud stack and deployed to DigitalOcean. The system manages annual planning, sermon series, sermon prep timelines, and content exports, while being reliable, secure, and cost-efficient.

⸻

2. Goals & Objectives
	•	Provide a centralized workspace for pastors, content teams, and volunteers.
	•	Enable real-time collaboration on sermon planning.
	•	Support 52 sermons, 12 series, 8 themes annually.
	•	Allow multi-format exports (PDF, Excel, iCal, JSON) for team-wide use.
	•	Deployable within 30 minutes on DigitalOcean with minimal maintenance.
	•	Protect data via Firebase Auth + DO managed services.

⸻

3. Core Features
	•	User Auth: Gmail SSO via Firebase.
	•	Planning Spaces: annual → series → sermon structure, editable timelines.
	•	Collaboration: click-to-edit UI, version history, drag-and-drop calendar.
	•	Exports: PDF, Excel, iCal, JSON with date-range selection.
	•	Storage: DigitalOcean Spaces for sermon media, images, docs.
	•	System Reliability: daily backups, managed Postgres, load balancer support.

⸻

4. Non-Goals (MVP)
	•	No public API (reserved for future).
	•	No AI sermon suggestion engine (future roadmap).
	•	No offline-first support (future).

⸻

5. Success Metrics
	•	Staff adoption: >80% active planners within first quarter.
	•	Reliability: <1% downtime.
	•	Onboarding: time-to-first-sermon entry < 10 minutes.
	•	Utility: >75% of sermons exported for production.

⸻

6. User Personas
	•	Pastors: want visibility into yearly sermon flow.
	•	Content Team: need collaborative tools for themes & scriptures.
	•	Media/Volunteer Team: rely on export outputs for weekly execution.
	•	Admins: manage roles, backups, troubleshooting.

⸻

7. System Requirements
	•	AppFlowy Cloud core engine.
	•	Postgres (managed on DO).
	•	Redis (optional caching).
	•	Firebase Auth for SSO.
	•	DigitalOcean Spaces for media/CDN.
	•	Nginx + Let’s Encrypt for TLS.
	•	Docker Compose for baseline deployment, K8s optional for scaling.

⸻

8. Risks & Mitigations
	•	Complex setup → mitigate with Docker Compose quickstart.
	•	Data loss → enforce daily DB + Spaces backups.
	•	Security issues → Firebase auth, XSS/CSRF prevention, upload sanitization.
	•	Volunteer confusion → provide UX that mimics calendars/checklists, plus training docs.

⸻

9. Roadmap
	•	Q3 2025: MVP (auth, planning spaces, exports, DO deployment).
	•	Q4 2025: Roles & permissions, content kits, dashboards.
	•	Q1 2026: Multi-campus support, AI sermon suggestions, offline-first sync.

## Notes:
A web-based sermon planning and management system designed for Cape Christian. Where each planning meeting has its own space. For example, the Series Planning meeting has its own meeting space powered by something like https://github.com/WordPress/gutenberg. The meeting space includes relevant teams, the main person delivering the message, scriptures, topics, trends, themes, etc., to consider. The Sermon Preparation Timeline is fully editable. 

Anyone who logs in can see the planning sessions, meetings, calendar, etc. There is version history to rollback or review previous saved or auto-saved versions. 

## Features

### 🎯 Core Features
- **Meeting Schedule Management**: Track Series Planning (bi-annual), Content Planning (quarterly), and Wordsmith sessions (monthly)
- **52 Sermons Annual Tracking**: Complete yearly sermon calendar
- **12 Sermon Series Management**: Organize sermons into thematic series
- **8 Annual Themes**: High-level theme organization
- **Fully Editable Interface**: Click-to-edit functionality throughout. And it can be saved under users profiles. For example, the checklist under Pre-Creative (Brainstorm) SOP Checklist can be fully editable and formated. 
- **User Login**: Leverage Firebase to login using Gmail. 

### 📅 Planning Tools
- **Visual Calendar**: Month-by-month meeting overview
- **Drag-and-Drop Timeline**: 6-phase sermon preparation workflow
- **Scripture Integration**: Support for YouVersion, Bible App, and BibleGateway 