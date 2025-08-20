import { Router, Request, Response } from 'express';
import { 
  AuthenticatedRequest,
  ExportRequest,
  ExportFormat,
  ApiResponse,
  UserRole
} from '../types';
import { 
  validate, 
  exportRequestSchema
} from '../middleware/validation';
import { 
  requireRole, 
  requireWorkspaceAccess 
} from '../middleware/auth';
import { 
  heavyOperationRateLimit 
} from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { DatabaseService } from '../services/database';
import { logger } from '../utils/logger';
import { 
  NotFoundError, 
  BusinessLogicError 
} from '../types';

// Import export services
import ExcelJS from 'exceljs';
import ical from 'ical-generator';
import puppeteer from 'puppeteer';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

/**
 * POST /api/v1/exports/sermons
 * Export sermons in various formats
 */
router.post('/sermons',
  requireRole([UserRole.ADMIN, UserRole.PASTOR, UserRole.VOLUNTEER]),
  heavyOperationRateLimit,
  validate(exportRequestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const exportRequest = req.body as ExportRequest;

    logger.info(`Export requested: ${exportRequest.format} by ${user.email}`);

    // Build query based on filters
    const conditions = ['s.workspace_id = $1'];
    const params = [user.workspace_id];
    let paramIndex = 2;

    if (exportRequest.date_range) {
      conditions.push(`s.service_date >= $${paramIndex}`);
      params.push(exportRequest.date_range.start);
      paramIndex++;
      
      conditions.push(`s.service_date <= $${paramIndex}`);
      params.push(exportRequest.date_range.end);
      paramIndex++;
    }

    if (exportRequest.series_ids && exportRequest.series_ids.length > 0) {
      conditions.push(`s.series_id = ANY($${paramIndex})`);
      params.push(exportRequest.series_ids);
      paramIndex++;
    }

    if (exportRequest.sermon_ids && exportRequest.sermon_ids.length > 0) {
      conditions.push(`s.id = ANY($${paramIndex})`);
      params.push(exportRequest.sermon_ids);
      paramIndex++;
    }

    // Get sermon data
    const query = `
      SELECT 
        s.id, s.title, s.subtitle, s.service_date, s.service_time,
        s.duration_minutes, s.status, s.sermon_type, s.scripture_references,
        s.main_points, s.target_audience, s.description, s.notes,
        s.tags, s.is_published, s.created_at,
        -- Speaker info
        speaker.display_name as speaker_name,
        speaker.email as speaker_email,
        -- Series info
        series.title as series_title,
        series.description as series_description,
        series.color_theme as series_color
      FROM sermons s
      LEFT JOIN users speaker ON s.speaker_id = speaker.id
      LEFT JOIN sermon_series series ON s.series_id = series.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.service_date ASC
    `;

    const sermonsResult = await DatabaseService.query(query, params);
    const sermons = sermonsResult.rows;

    if (sermons.length === 0) {
      throw new NotFoundError('No sermons found matching the criteria');
    }

    // Include resources if requested
    let sermonsWithResources = sermons;
    if (exportRequest.include_resources) {
      for (const sermon of sermons) {
        const resourcesResult = await DatabaseService.query(
          `SELECT sr.type, sr.title, sr.description, sr.url, sr.created_at,
           u.display_name as uploaded_by_name
           FROM sermon_resources sr
           LEFT JOIN users u ON sr.uploaded_by = u.id
           WHERE sr.sermon_id = $1
           ORDER BY sr.created_at DESC`,
          [sermon.id]
        );
        sermon.resources = resourcesResult.rows;
      }
    }

    let exportResult: any;

    switch (exportRequest.format) {
      case ExportFormat.PDF:
        exportResult = await exportToPDF(sermonsWithResources, exportRequest);
        break;
      case ExportFormat.EXCEL:
        exportResult = await exportToExcel(sermonsWithResources, exportRequest);
        break;
      case ExportFormat.ICAL:
        exportResult = await exportToICal(sermonsWithResources, exportRequest);
        break;
      case ExportFormat.JSON:
        exportResult = await exportToJSON(sermonsWithResources, exportRequest);
        break;
      case ExportFormat.CSV:
        exportResult = await exportToCSV(sermonsWithResources, exportRequest);
        break;
      default:
        throw new BusinessLogicError('Unsupported export format');
    }

    logger.info(`Export completed: ${exportRequest.format} (${sermons.length} sermons) by ${user.email}`);

    const response: ApiResponse<any> = {
      success: true,
      data: exportResult,
      message: `${exportRequest.format.toUpperCase()} export completed successfully`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * Export to PDF format
 */
async function exportToPDF(sermons: any[], exportRequest: ExportRequest): Promise<any> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Generate HTML content
  const html = generateHTMLForPDF(sermons, exportRequest);
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });

  await browser.close();

  // Save to temporary file or cloud storage
  const filename = `sermons_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
  const filepath = path.join('/tmp', filename);
  
  await fs.writeFile(filepath, pdfBuffer);

  return {
    filename,
    filepath,
    download_url: `/api/v1/exports/download/${filename}`,
    size: pdfBuffer.length,
    expires_at: dayjs().add(24, 'hours').toISOString()
  };
}

/**
 * Export to Excel format
 */
async function exportToExcel(sermons: any[], exportRequest: ExportRequest): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CCF Sermon Planner';
  workbook.created = new Date();

  // Main sermons sheet
  const worksheet = workbook.addWorksheet('Sermons');
  
  // Define columns
  const columns = [
    { header: 'Date', key: 'service_date', width: 12 },
    { header: 'Time', key: 'service_time', width: 10 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Subtitle', key: 'subtitle', width: 25 },
    { header: 'Speaker', key: 'speaker_name', width: 20 },
    { header: 'Series', key: 'series_title', width: 25 },
    { header: 'Duration (min)', key: 'duration_minutes', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Type', key: 'sermon_type', width: 15 },
    { header: 'Scripture', key: 'scripture_text', width: 30 },
    { header: 'Main Points', key: 'main_points_text', width: 40 },
    { header: 'Target Audience', key: 'target_audience', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Tags', key: 'tags_text', width: 25 },
    { header: 'Published', key: 'is_published', width: 10 }
  ];

  worksheet.columns = columns;

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data rows
  sermons.forEach(sermon => {
    const scriptureText = sermon.scripture_references ? 
      sermon.scripture_references.map((ref: any) => 
        `${ref.book} ${ref.chapter}${ref.verse_start ? `:${ref.verse_start}` : ''}${ref.verse_end ? `-${ref.verse_end}` : ''}`
      ).join('; ') : '';

    const mainPointsText = sermon.main_points ? 
      sermon.main_points.join('; ') : '';

    const tagsText = sermon.tags ? 
      sermon.tags.join(', ') : '';

    worksheet.addRow({
      service_date: dayjs(sermon.service_date).format('YYYY-MM-DD'),
      service_time: sermon.service_time,
      title: sermon.title,
      subtitle: sermon.subtitle,
      speaker_name: sermon.speaker_name,
      series_title: sermon.series_title,
      duration_minutes: sermon.duration_minutes,
      status: sermon.status,
      sermon_type: sermon.sermon_type,
      scripture_text: scriptureText,
      main_points_text: mainPointsText,
      target_audience: sermon.target_audience,
      description: sermon.description,
      tags_text: tagsText,
      is_published: sermon.is_published ? 'Yes' : 'No'
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `O${sermons.length + 1}`
  };

  // Resources sheet (if included)
  if (exportRequest.include_resources) {
    const resourcesSheet = workbook.addWorksheet('Resources');
    resourcesSheet.columns = [
      { header: 'Sermon Title', key: 'sermon_title', width: 30 },
      { header: 'Resource Type', key: 'type', width: 15 },
      { header: 'Resource Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'URL', key: 'url', width: 50 },
      { header: 'Uploaded By', key: 'uploaded_by_name', width: 20 },
      { header: 'Upload Date', key: 'created_at', width: 15 }
    ];

    // Style header
    resourcesSheet.getRow(1).font = { bold: true };
    resourcesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    sermons.forEach(sermon => {
      if (sermon.resources) {
        sermon.resources.forEach((resource: any) => {
          resourcesSheet.addRow({
            sermon_title: sermon.title,
            type: resource.type,
            title: resource.title,
            description: resource.description,
            url: resource.url,
            uploaded_by_name: resource.uploaded_by_name,
            created_at: dayjs(resource.created_at).format('YYYY-MM-DD')
          });
        });
      }
    });
  }

  // Save to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  const filename = `sermons_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
  const filepath = path.join('/tmp', filename);
  
  await fs.writeFile(filepath, buffer);

  return {
    filename,
    filepath,
    download_url: `/api/v1/exports/download/${filename}`,
    size: buffer.byteLength,
    expires_at: dayjs().add(24, 'hours').toISOString()
  };
}

/**
 * Export to iCal format
 */
async function exportToICal(sermons: any[], exportRequest: ExportRequest): Promise<any> {
  const calendar = ical({
    name: 'CCF Sermon Schedule',
    description: 'Sermon planning calendar export',
    prodId: {
      company: 'Cape Christian Fellowship',
      product: 'Sermon Planner'
    }
  });

  sermons.forEach(sermon => {
    const startDate = dayjs(`${sermon.service_date} ${sermon.service_time}`).toDate();
    const endDate = dayjs(startDate).add(sermon.duration_minutes, 'minutes').toDate();

    calendar.createEvent({
      id: sermon.id,
      start: startDate,
      end: endDate,
      summary: sermon.title,
      description: [
        sermon.subtitle ? `Subtitle: ${sermon.subtitle}` : '',
        `Speaker: ${sermon.speaker_name}`,
        sermon.series_title ? `Series: ${sermon.series_title}` : '',
        sermon.description ? `Description: ${sermon.description}` : '',
        sermon.scripture_references ? 
          `Scripture: ${sermon.scripture_references.map((ref: any) => 
            `${ref.book} ${ref.chapter}${ref.verse_start ? `:${ref.verse_start}` : ''}${ref.verse_end ? `-${ref.verse_end}` : ''}`
          ).join('; ')}` : ''
      ].filter(Boolean).join('\n'),
      location: 'Cape Christian Fellowship',
      categories: [
        sermon.sermon_type,
        sermon.series_title,
        ...sermon.tags
      ].filter(Boolean)
    });
  });

  const icalContent = calendar.toString();
  
  const filename = `sermons_calendar_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.ics`;
  const filepath = path.join('/tmp', filename);
  
  await fs.writeFile(filepath, icalContent, 'utf8');

  return {
    filename,
    filepath,
    download_url: `/api/v1/exports/download/${filename}`,
    size: Buffer.byteLength(icalContent, 'utf8'),
    expires_at: dayjs().add(24, 'hours').toISOString()
  };
}

/**
 * Export to JSON format
 */
async function exportToJSON(sermons: any[], exportRequest: ExportRequest): Promise<any> {
  const exportData = {
    metadata: {
      exported_at: new Date().toISOString(),
      format: 'json',
      total_sermons: sermons.length,
      includes_resources: exportRequest.include_resources,
      date_range: exportRequest.date_range
    },
    sermons: sermons.map(sermon => ({
      ...sermon,
      // Parse JSON fields
      scripture_references: typeof sermon.scripture_references === 'string' ? 
        JSON.parse(sermon.scripture_references) : sermon.scripture_references,
      main_points: typeof sermon.main_points === 'string' ? 
        JSON.parse(sermon.main_points) : sermon.main_points,
      tags: typeof sermon.tags === 'string' ? 
        JSON.parse(sermon.tags) : sermon.tags
    }))
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  
  const filename = `sermons_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.json`;
  const filepath = path.join('/tmp', filename);
  
  await fs.writeFile(filepath, jsonContent, 'utf8');

  return {
    filename,
    filepath,
    download_url: `/api/v1/exports/download/${filename}`,
    size: Buffer.byteLength(jsonContent, 'utf8'),
    expires_at: dayjs().add(24, 'hours').toISOString()
  };
}

/**
 * Export to CSV format
 */
async function exportToCSV(sermons: any[], exportRequest: ExportRequest): Promise<any> {
  const headers = [
    'Date', 'Time', 'Title', 'Subtitle', 'Speaker', 'Series', 
    'Duration (min)', 'Status', 'Type', 'Scripture', 'Main Points',
    'Target Audience', 'Description', 'Tags', 'Published'
  ];

  const csvRows = [headers.join(',')];

  sermons.forEach(sermon => {
    const scriptureText = sermon.scripture_references ? 
      sermon.scripture_references.map((ref: any) => 
        `${ref.book} ${ref.chapter}${ref.verse_start ? `:${ref.verse_start}` : ''}${ref.verse_end ? `-${ref.verse_end}` : ''}`
      ).join('; ') : '';

    const mainPointsText = sermon.main_points ? 
      sermon.main_points.join('; ') : '';

    const tagsText = sermon.tags ? 
      sermon.tags.join(', ') : '';

    const row = [
      dayjs(sermon.service_date).format('YYYY-MM-DD'),
      sermon.service_time,
      escapeCSV(sermon.title),
      escapeCSV(sermon.subtitle || ''),
      escapeCSV(sermon.speaker_name),
      escapeCSV(sermon.series_title || ''),
      sermon.duration_minutes,
      sermon.status,
      sermon.sermon_type,
      escapeCSV(scriptureText),
      escapeCSV(mainPointsText),
      escapeCSV(sermon.target_audience || ''),
      escapeCSV(sermon.description || ''),
      escapeCSV(tagsText),
      sermon.is_published ? 'Yes' : 'No'
    ];

    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  
  const filename = `sermons_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
  const filepath = path.join('/tmp', filename);
  
  await fs.writeFile(filepath, csvContent, 'utf8');

  return {
    filename,
    filepath,
    download_url: `/api/v1/exports/download/${filename}`,
    size: Buffer.byteLength(csvContent, 'utf8'),
    expires_at: dayjs().add(24, 'hours').toISOString()
  };
}

/**
 * GET /api/v1/exports/download/:filename
 * Download exported file
 */
router.get('/download/:filename',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.params;
    const filepath = path.join('/tmp', filename);

    try {
      await fs.access(filepath);
      
      // Set appropriate headers
      const extension = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (extension) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case '.ics':
          contentType = 'text/calendar';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.csv':
          contentType = 'text/csv';
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileData = await fs.readFile(filepath);
      res.send(fileData);

      // Clean up file after download (async)
      setTimeout(async () => {
        try {
          await fs.unlink(filepath);
        } catch (error) {
          logger.warn(`Failed to clean up export file: ${filepath}`, error);
        }
      }, 5000);

    } catch (error) {
      throw new NotFoundError('Export file not found or expired');
    }
  })
);

/**
 * Utility functions
 */
function generateHTMLForPDF(sermons: any[], exportRequest: ExportRequest): string {
  const dateRange = exportRequest.date_range ? 
    `${dayjs(exportRequest.date_range.start).format('MMM DD, YYYY')} - ${dayjs(exportRequest.date_range.end).format('MMM DD, YYYY')}` : 
    'All Time';

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sermon Export</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .sermon { margin-bottom: 30px; page-break-inside: avoid; }
        .sermon-header { background: #f5f5f5; padding: 10px; border-left: 4px solid #333; }
        .sermon-title { font-size: 18px; font-weight: bold; margin: 0; }
        .sermon-meta { color: #666; margin: 5px 0; }
        .sermon-content { padding: 15px; border: 1px solid #ddd; }
        .scripture { background: #fff8dc; padding: 10px; margin: 10px 0; border-left: 3px solid #daa520; }
        .main-points { margin: 10px 0; }
        .main-points li { margin: 5px 0; }
        .tags { margin-top: 10px; }
        .tag { background: #e1e8ed; padding: 2px 6px; border-radius: 3px; margin: 2px; display: inline-block; font-size: 12px; }
        @media print { .sermon { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cape Christian Fellowship - Sermon Export</h1>
        <p>Period: ${dateRange} | Total Sermons: ${sermons.length}</p>
        <p>Generated: ${dayjs().format('MMMM DD, YYYY at h:mm A')}</p>
      </div>
  `;

  sermons.forEach(sermon => {
    const scriptureRefs = sermon.scripture_references ? 
      sermon.scripture_references.map((ref: any) => 
        `${ref.book} ${ref.chapter}${ref.verse_start ? `:${ref.verse_start}` : ''}${ref.verse_end ? `-${ref.verse_end}` : ''} (${ref.version})`
      ).join(', ') : 'None specified';

    const mainPoints = sermon.main_points ? 
      sermon.main_points.map((point: string) => `<li>${point}</li>`).join('') : '';

    const tags = sermon.tags ? 
      sermon.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('') : '';

    html += `
      <div class="sermon">
        <div class="sermon-header">
          <div class="sermon-title">${sermon.title}</div>
          ${sermon.subtitle ? `<div class="sermon-meta">Subtitle: ${sermon.subtitle}</div>` : ''}
          <div class="sermon-meta">
            Date: ${dayjs(sermon.service_date).format('MMMM DD, YYYY')} at ${sermon.service_time} | 
            Speaker: ${sermon.speaker_name} | 
            Duration: ${sermon.duration_minutes} minutes
          </div>
          ${sermon.series_title ? `<div class="sermon-meta">Series: ${sermon.series_title}</div>` : ''}
        </div>
        <div class="sermon-content">
          <div class="scripture">
            <strong>Scripture References:</strong> ${scriptureRefs}
          </div>
          ${mainPoints ? `
            <div class="main-points">
              <strong>Main Points:</strong>
              <ul>${mainPoints}</ul>
            </div>
          ` : ''}
          ${sermon.description ? `
            <div>
              <strong>Description:</strong> ${sermon.description}
            </div>
          ` : ''}
          ${sermon.target_audience ? `
            <div style="margin-top: 10px;">
              <strong>Target Audience:</strong> ${sermon.target_audience}
            </div>
          ` : ''}
          ${tags ? `<div class="tags"><strong>Tags:</strong> ${tags}</div>` : ''}
        </div>
      </div>
    `;
  });

  html += '</body></html>';
  return html;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default router;