# Cape Christian Fellowship - Sermon Planning System

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
- **File Attachments**: Images, PDFs, videos, links, and resources

### 📤 Export Options
- PDF for printing and sharing
- Excel for data analysis
- iCal for calendar integration
- JSON for backup and data transfer

### 🎨 User Experience
- Responsive design for all devices
- Dark mode support
- Auto-save functionality
- Real-time updates
- Intuitive navigation

## Installation

### Requirements
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx web server
- SSL certificate (recommended)

### Installation Steps

1. **Upload Files**
   - Upload all files to your web server
   - Ensure the document root points to the main directory

2. **Configure Database**
   - Import `database.sql` to create the database structure
   - Update `config.php` with your database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'your_database_name');
   define('DB_USER', 'your_database_user');
   define('DB_PASS', 'your_database_password');
   ```

3. **Set Permissions**
   - Make `assets/uploads/` directory writable (755 or 775)
   - Ensure `.htaccess` file is processed by Apache

4. **Configure Settings**
   - Update `SITE_URL` in `config.php`
   - Set your timezone in `config.php`
   - Generate secure API and JWT keys

5. **Create Admin User**
   - Access `/install.php` (create this file if needed)
   - Or manually update the admin user in the database:
   ```sql
   UPDATE users SET password_hash = '$2y$10$[your-bcrypt-hash]' WHERE username = 'admin';
   ```

## Usage

### First Login
1. Navigate to your installation URL
2. Click "Login" in the top right
3. Use default credentials:
   - Username: `admin`
   - Password: `admin123` (change immediately!)

### Adding Meetings
1. Go to "Meeting Schedule" tab
2. Click "Add Meeting" button
3. Fill in meeting details
4. Save and the meeting appears in the calendar

### Managing Sermons
1. Navigate to "Sermon Timeline" tab
2. View upcoming sermons with preparation phases
3. Drag phases to reorder
4. Click checkmarks to mark phases complete

### Series Management
1. Open "Series Management" tab
2. Click "Add Series" to create new series
3. Assign sermons to series
4. Track progress and themes

### Exporting Data
1. Click "Export" button in header
2. Choose format (PDF, Excel, iCal, JSON)
3. Select date range if needed
4. Download generated file

## API Documentation


### Authentication
```
POST /api/auth/login
{
  "username": "user@example.com",
  "password": "password"
}
```

### Meetings
```
GET /api/meetings
GET /api/meetings/{id}
POST /api/meetings
PUT /api/meetings/{id}
DELETE /api/meetings/{id}
```

### Sermons
```
GET /api/sermons
GET /api/sermons/{id}
POST /api/sermons
PUT /api/sermons/{id}
DELETE /api/sermons/{id}
```

## Security

- All passwords are bcrypt hashed
- JWT tokens for API authentication
- SQL injection prevention via prepared statements
- XSS protection through output encoding
- CSRF protection for forms
- File upload validation and sanitization

## Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check PHP error logs
   - Verify `.htaccess` is being processed
   - Ensure mod_rewrite is enabled

2. **Database Connection Failed**
   - Verify database credentials in `config.php`
   - Check MySQL service is running
   - Ensure database exists

3. **File Upload Issues**
   - Check `assets/uploads/` permissions
   - Verify PHP upload limits in php.ini
   - Ensure enough disk space

4. **Login Problems**
   - Clear browser cookies
   - Check user exists in database
   - Verify password hash is correct

## Support

For issues or questions:
- Check error logs in the root directory
- Review browser console for JavaScript errors
- Contact your system administrator

## License

Copyright © 2025 Cape Christian Fellowship. All rights reserved.

## Credits

Built with:
- PHP & MySQL
- Tailwind CSS
- Alpine.js
- Chart.js
- Font Awesome

---

**Version**: 1.0.0  
**Last Updated**: January 2025