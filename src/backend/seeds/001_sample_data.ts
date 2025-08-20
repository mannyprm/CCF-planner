import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data in reverse dependency order
  await knex('sermon_themes').del();
  await knex('series_themes').del();
  await knex('export_history').del();
  await knex('activity_logs').del();
  await knex('collaborators').del();
  await knex('media_resources').del();
  await knex('sermons').del();
  await knex('sermon_series').del();
  await knex('themes').del();
  await knex('users').del();
  await knex('workspaces').del();
  await knex('organizations').del();

  // Sample organization
  const [organization] = await knex('organizations').insert([
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Community Christian Fellowship',
      description: 'A vibrant church community focused on biblical teaching and fellowship',
      subdomain: 'ccf-demo',
      primary_email: 'info@ccf-church.org',
      phone: '+1-555-123-4567',
      website: 'https://ccf-church.org',
      address: {
        street: '123 Faith Avenue',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701',
        country: 'USA'
      },
      settings: {
        default_timezone: 'America/Chicago',
        fiscal_year_start: 'January',
        multi_site: false
      },
      subscription_tier: 'premium',
      is_active: true
    }
  ]).returning(['id', 'name']);

  // Sample workspace for 2024
  const [workspace] = await knex('workspaces').insert([
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      organization_id: organization.id,
      name: '2024 Sermon Planning',
      description: 'Annual sermon planning for 2024',
      church_name: 'Community Christian Fellowship',
      planning_year: 2024,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      address: {
        street: '123 Faith Avenue',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701',
        country: 'USA'
      },
      settings: {
        time_zone: 'America/Chicago',
        default_service_time: '10:30',
        advance_planning_weeks: 12,
        sermon_length_minutes: 35,
        allow_guest_speakers: true,
        require_approval: false,
        branding: {
          primary_color: '#2563EB',
          secondary_color: '#DC2626'
        }
      },
      subscription_tier: 'premium',
      is_active: true,
      created_by: '323e4567-e89b-12d3-a456-426614174002' // Will be created below
    }
  ]).returning(['id', 'name']);

  // Sample users
  const users = await knex('users').insert([
    {
      id: '323e4567-e89b-12d3-a456-426614174002',
      firebase_uid: 'firebase_uid_pastor_john',
      organization_id: organization.id,
      default_workspace_id: workspace.id,
      email: 'pastor@ccf-church.org',
      display_name: 'Pastor John Smith',
      first_name: 'John',
      last_name: 'Smith',
      title: 'Senior Pastor',
      role: 'admin',
      permissions: ['all'],
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sermon_reminders: true,
          deadline_alerts: true
        },
        timezone: 'America/Chicago',
        language: 'en'
      },
      is_active: true,
      email_verified: true
    },
    {
      id: '423e4567-e89b-12d3-a456-426614174003',
      firebase_uid: 'firebase_uid_sarah_wilson',
      organization_id: organization.id,
      default_workspace_id: workspace.id,
      email: 'sarah@ccf-church.org',
      display_name: 'Sarah Wilson',
      first_name: 'Sarah',
      last_name: 'Wilson',
      title: 'Associate Pastor',
      role: 'pastor',
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          push: false,
          sermon_reminders: true,
          deadline_alerts: true
        },
        timezone: 'America/Chicago',
        language: 'en'
      },
      is_active: true,
      email_verified: true
    },
    {
      id: '523e4567-e89b-12d3-a456-426614174004',
      firebase_uid: 'firebase_uid_mike_johnson',
      organization_id: organization.id,
      default_workspace_id: workspace.id,
      email: 'mike@ccf-church.org',
      display_name: 'Mike Johnson',
      first_name: 'Mike',
      last_name: 'Johnson',
      title: 'Worship Leader',
      role: 'volunteer',
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          sermon_reminders: false,
          deadline_alerts: true
        },
        timezone: 'America/Chicago',
        language: 'en'
      },
      is_active: true,
      email_verified: true
    }
  ]).returning(['id', 'display_name']);

  // Update workspace created_by reference
  await knex('workspaces').where('id', workspace.id).update({
    created_by: users[0].id
  });

  // Sample themes (8 annual themes)
  const themes = await knex('themes').insert([
    {
      id: '623e4567-e89b-12d3-a456-426614174005',
      workspace_id: workspace.id,
      name: 'Faith',
      description: 'Building and strengthening our faith in God',
      theme_scripture: 'Hebrews 11:1 - Now faith is confidence in what we hope for and assurance about what we do not see.',
      color: '#3B82F6',
      icon: 'cross',
      display_order: 1,
      associated_months: [1, 2],
      key_concepts: ['trust', 'belief', 'confidence', 'assurance'],
      scripture_references: ['Hebrews 11:1-40', 'Romans 10:17', 'James 2:14-26'],
      suggested_topics: ['What is Faith?', 'Faith in Action', 'Heroes of Faith'],
      created_by: users[0].id
    },
    {
      id: '723e4567-e89b-12d3-a456-426614174006',
      workspace_id: workspace.id,
      name: 'Hope',
      description: 'Finding hope in Christ during difficult times',
      theme_scripture: 'Romans 15:13 - May the God of hope fill you with all joy and peace as you trust in him.',
      color: '#10B981',
      icon: 'sunrise',
      display_order: 2,
      associated_months: [3, 4],
      associated_seasons: ['easter'],
      key_concepts: ['expectation', 'confidence', 'anticipation', 'future'],
      scripture_references: ['Romans 15:13', '1 Peter 1:3', 'Jeremiah 29:11'],
      suggested_topics: ['Hope in Suffering', 'Easter Hope', 'Future Glory'],
      created_by: users[0].id
    },
    {
      id: '823e4567-e89b-12d3-a456-426614174007',
      workspace_id: workspace.id,
      name: 'Love',
      description: 'Understanding and expressing God\'s love',
      theme_scripture: '1 John 4:8 - Whoever does not love does not know God, because God is love.',
      color: '#EF4444',
      icon: 'heart',
      display_order: 3,
      associated_months: [5, 6],
      key_concepts: ['agape', 'compassion', 'sacrifice', 'relationship'],
      scripture_references: ['1 John 4:7-21', '1 Corinthians 13', 'John 3:16'],
      suggested_topics: ['God\'s Love for Us', 'Loving Others', 'Perfect Love'],
      created_by: users[0].id
    },
    {
      id: '923e4567-e89b-12d3-a456-426614174008',
      workspace_id: workspace.id,
      name: 'Grace',
      description: 'Experiencing and extending God\'s unmerited favor',
      theme_scripture: 'Ephesians 2:8 - For it is by grace you have been saved, through faith.',
      color: '#8B5CF6',
      icon: 'gift',
      display_order: 4,
      associated_months: [7, 8],
      key_concepts: ['unmerited favor', 'forgiveness', 'salvation', 'mercy'],
      scripture_references: ['Ephesians 2:8-9', '2 Corinthians 12:9', 'Romans 3:23-24'],
      suggested_topics: ['Amazing Grace', 'Grace vs. Works', 'Living in Grace'],
      created_by: users[0].id
    },
    {
      id: 'a23e4567-e89b-12d3-a456-426614174009',
      workspace_id: workspace.id,
      name: 'Service',
      description: 'Called to serve God and others',
      theme_scripture: 'Mark 10:43 - Whoever wants to become great among you must be your servant.',
      color: '#F59E0B',
      icon: 'hands-helping',
      display_order: 5,
      associated_months: [9],
      key_concepts: ['ministry', 'servanthood', 'humility', 'giving'],
      scripture_references: ['Mark 10:42-45', 'Philippians 2:5-11', 'Galatians 5:13'],
      suggested_topics: ['Heart of a Servant', 'Serving in the Church', 'Community Service'],
      created_by: users[0].id
    },
    {
      id: 'b23e4567-e89b-12d3-a456-426614174010',
      workspace_id: workspace.id,
      name: 'Gratitude',
      description: 'Living with thankful hearts',
      theme_scripture: '1 Thessalonians 5:18 - Give thanks in all circumstances.',
      color: '#D97706',
      icon: 'leaf',
      display_order: 6,
      associated_months: [10, 11],
      associated_seasons: ['thanksgiving'],
      key_concepts: ['thankfulness', 'appreciation', 'contentment', 'praise'],
      scripture_references: ['1 Thessalonians 5:18', 'Psalm 100', 'Colossians 3:15-17'],
      suggested_topics: ['Thanksgiving in All Things', 'Grateful Living', 'Counting Blessings'],
      created_by: users[0].id
    },
    {
      id: 'c23e4567-e89b-12d3-a456-426614174011',
      workspace_id: workspace.id,
      name: 'Peace',
      description: 'Finding peace in God\'s presence',
      theme_scripture: 'John 14:27 - Peace I leave with you; my peace I give you.',
      color: '#06B6D4',
      icon: 'dove',
      display_order: 7,
      associated_months: [12],
      associated_seasons: ['advent', 'christmas'],
      key_concepts: ['tranquility', 'rest', 'calm', 'reconciliation'],
      scripture_references: ['John 14:27', 'Philippians 4:6-7', 'Isaiah 26:3'],
      suggested_topics: ['Prince of Peace', 'Inner Peace', 'Peace with Others'],
      created_by: users[0].id
    },
    {
      id: 'd23e4567-e89b-12d3-a456-426614174012',
      workspace_id: workspace.id,
      name: 'Growth',
      description: 'Spiritual growth and maturity in Christ',
      theme_scripture: '2 Peter 3:18 - But grow in the grace and knowledge of our Lord and Savior Jesus Christ.',
      color: '#65A30D',
      icon: 'seedling',
      display_order: 8,
      associated_months: [1, 12], // Year-round theme
      key_concepts: ['maturity', 'development', 'discipleship', 'transformation'],
      scripture_references: ['2 Peter 3:18', 'Ephesians 4:15', '1 Peter 2:2'],
      suggested_topics: ['Growing in Faith', 'Spiritual Disciplines', 'Mature Discipleship'],
      created_by: users[0].id
    }
  ]).returning(['id', 'name']);

  // Sample sermon series (4 series for different quarters)
  const series = await knex('sermon_series').insert([
    {
      id: 'e23e4567-e89b-12d3-a456-426614174013',
      workspace_id: workspace.id,
      title: 'Foundations of Faith',
      description: 'A foundational series exploring the basics of Christian faith',
      theme_scripture: 'Hebrews 11:1-6',
      series_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      color_theme: '#3B82F6',
      start_date: '2024-01-07',
      end_date: '2024-03-31',
      series_type: 'topical',
      target_audience: 'adults',
      estimated_sermons: 12,
      actual_sermons: 0, // Will be updated by triggers
      display_order: 1,
      is_active: true,
      is_published: true,
      published_at: '2023-12-15T10:00:00Z',
      tags: ['faith', 'basics', 'foundation'],
      topics: ['salvation', 'prayer', 'bible study', 'church'],
      scripture_books: ['Hebrews', 'Romans', 'Ephesians'],
      resources: ['https://example.com/faith-study-guide'],
      notes: 'Perfect for new believers and those wanting to revisit the fundamentals',
      goals: 'Help members establish a strong foundation in their faith',
      status: 'in_progress',
      completion_status: {
        outline_complete: true,
        resources_gathered: true,
        artwork_ready: true,
        promotion_ready: true
      },
      created_by: users[0].id
    },
    {
      id: 'f23e4567-e89b-12d3-a456-426614174014',
      workspace_id: workspace.id,
      title: 'Journey to Easter',
      description: 'A Lenten series preparing hearts for Easter celebration',
      theme_scripture: 'Luke 9:23',
      series_image: 'https://images.unsplash.com/photo-1489391085767-6fc85ed87b12',
      color_theme: '#8B5CF6',
      start_date: '2024-02-14',
      end_date: '2024-03-31',
      series_type: 'seasonal',
      target_audience: 'all ages',
      estimated_sermons: 7,
      actual_sermons: 0,
      display_order: 2,
      is_active: true,
      is_published: true,
      published_at: '2024-01-20T10:00:00Z',
      tags: ['lent', 'easter', 'sacrifice', 'resurrection'],
      topics: ['cross', 'suffering', 'salvation', 'victory'],
      scripture_books: ['Matthew', 'Mark', 'Luke', 'John'],
      resources: ['https://example.com/easter-devotional'],
      notes: 'Traditional Lenten themes with contemporary application',
      goals: 'Prepare congregation spiritually for Easter celebration',
      status: 'planning',
      completion_status: {
        outline_complete: false,
        resources_gathered: true,
        artwork_ready: false,
        promotion_ready: false
      },
      created_by: users[0].id
    },
    {
      id: 'g23e4567-e89b-12d3-a456-426614174015',
      workspace_id: workspace.id,
      title: 'Life in the Spirit',
      description: 'Understanding the Holy Spirit\'s role in our daily lives',
      theme_scripture: 'John 16:13',
      series_image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c90a',
      color_theme: '#EF4444',
      start_date: '2024-04-07',
      end_date: '2024-06-30',
      series_type: 'expository',
      target_audience: 'adults',
      estimated_sermons: 10,
      actual_sermons: 0,
      display_order: 3,
      is_active: true,
      is_published: false,
      tags: ['holy spirit', 'spiritual gifts', 'fruit of spirit'],
      topics: ['guidance', 'power', 'spiritual gifts', 'transformation'],
      scripture_books: ['Acts', 'Romans', 'Galatians', '1 Corinthians'],
      resources: [],
      notes: 'Deep dive into pneumatology with practical applications',
      goals: 'Help members understand and experience life in the Spirit',
      status: 'planning',
      completion_status: {
        outline_complete: false,
        resources_gathered: false,
        artwork_ready: false,
        promotion_ready: false
      },
      created_by: users[1].id
    }
  ]).returning(['id', 'title']);

  // Sample sermons for the first series
  const sermons = await knex('sermons').insert([
    {
      id: 'h23e4567-e89b-12d3-a456-426614174016',
      workspace_id: workspace.id,
      series_id: series[0].id,
      speaker_id: users[0].id,
      title: 'What is Faith?',
      subtitle: 'Understanding Biblical Faith',
      description: 'An introduction to biblical faith and its role in the Christian life',
      sermon_number: 1,
      service_date: '2024-01-07',
      service_time: '10:30',
      duration_minutes: 35,
      sermon_type: 'sunday_morning',
      scripture_references: [
        {
          book: 'Hebrews',
          chapter: 11,
          verse_start: 1,
          verse_end: 6,
          version: 'NIV',
          is_primary: true
        }
      ],
      main_scripture: 'Hebrews 11:1-6',
      main_points: [
        'Faith is confidence in what we hope for',
        'Faith is assurance about what we do not see',
        'Faith pleases God',
        'Faith requires belief that God exists and rewards seekers'
      ],
      sermon_outline: '1. Definition of Faith\n2. Examples of Faith\n3. Benefits of Faith\n4. Living by Faith',
      introduction: 'What comes to mind when you hear the word faith?',
      conclusion: 'Faith is not a leap in the dark, but a step into the light',
      call_to_action: 'Take one step of faith this week in your relationship with God',
      target_audience: 'adults',
      tags: ['faith', 'hebrews', 'foundation'],
      context_notes: 'Written to Hebrew Christians facing persecution',
      application_notes: 'How do we live by faith in our modern context?',
      status: 'delivered',
      preparation_status: {
        outline_complete: true,
        research_complete: true,
        slides_complete: true,
        notes_complete: true,
        practice_complete: true,
        last_updated: '2024-01-06T15:00:00Z'
      },
      is_published: true,
      published_at: '2024-01-07T11:30:00Z',
      speaker_notes: 'Emphasize the practical nature of faith',
      tech_notes: 'Video: "Faith Heroes" clip at minute 15',
      music_notes: 'Open with "Great is Thy Faithfulness"',
      view_count: 145,
      last_viewed: '2024-01-15T09:30:00Z',
      created_by: users[0].id
    },
    {
      id: 'i23e4567-e89b-12d3-a456-426614174017',
      workspace_id: workspace.id,
      series_id: series[0].id,
      speaker_id: users[0].id,
      title: 'Faith in Action',
      subtitle: 'When Faith Gets Its Hands Dirty',
      description: 'Exploring how authentic faith demonstrates itself through works',
      sermon_number: 2,
      service_date: '2024-01-14',
      service_time: '10:30',
      duration_minutes: 38,
      sermon_type: 'sunday_morning',
      scripture_references: [
        {
          book: 'James',
          chapter: 2,
          verse_start: 14,
          verse_end: 26,
          version: 'NIV',
          is_primary: true
        }
      ],
      main_scripture: 'James 2:14-26',
      main_points: [
        'Faith without works is dead',
        'True faith produces good works',
        'Works are evidence of faith',
        'Faith and works work together'
      ],
      sermon_outline: '1. The Problem: Dead Faith\n2. The Examples: Abraham and Rahab\n3. The Solution: Living Faith\n4. The Application: Our Works',
      introduction: 'Can faith exist without action?',
      conclusion: 'Let your faith be seen in your love',
      call_to_action: 'Choose one specific way to demonstrate your faith this week',
      target_audience: 'adults',
      tags: ['faith', 'works', 'james', 'action'],
      context_notes: 'James addresses practical Christian living',
      application_notes: 'Modern examples of faith in action',
      status: 'ready',
      preparation_status: {
        outline_complete: true,
        research_complete: true,
        slides_complete: true,
        notes_complete: true,
        practice_complete: false,
        last_updated: '2024-01-12T14:00:00Z'
      },
      is_published: false,
      speaker_notes: 'Include testimonies from congregation',
      tech_notes: 'Prepare slides showing faith-based service projects',
      music_notes: 'Close with "Here I Am to Worship"',
      view_count: 23,
      last_viewed: '2024-01-13T16:45:00Z',
      created_by: users[0].id
    },
    {
      id: 'j23e4567-e89b-12d3-a456-426614174018',
      workspace_id: workspace.id,
      series_id: series[0].id,
      speaker_id: users[1].id,
      title: 'Heroes of Faith',
      subtitle: 'Learning from Faith\'s Hall of Fame',
      description: 'Examining the lives of biblical faith heroes and their lessons for us',
      sermon_number: 3,
      service_date: '2024-01-21',
      service_time: '10:30',
      duration_minutes: 40,
      sermon_type: 'sunday_morning',
      scripture_references: [
        {
          book: 'Hebrews',
          chapter: 11,
          verse_start: 7,
          verse_end: 40,
          version: 'NIV',
          is_primary: true
        }
      ],
      main_scripture: 'Hebrews 11:7-40',
      main_points: [
        'Noah: Faith in God\'s warnings',
        'Abraham: Faith in God\'s promises',
        'Moses: Faith in God\'s calling',
        'Ordinary people with extraordinary faith'
      ],
      sermon_outline: '1. Noah\'s Faithful Obedience\n2. Abraham\'s Faithful Journey\n3. Moses\' Faithful Leadership\n4. Our Faithful Response',
      introduction: 'What makes someone a hero of faith?',
      conclusion: 'You are called to be a hero of faith in your generation',
      call_to_action: 'Identify one area where God is calling you to step out in faith',
      target_audience: 'all ages',
      tags: ['faith', 'heroes', 'hebrews', 'obedience'],
      context_notes: 'Hall of Fame passage encouraging perseverance',
      application_notes: 'Modern faith heroes in our community',
      status: 'in_preparation',
      preparation_status: {
        outline_complete: true,
        research_complete: false,
        slides_complete: false,
        notes_complete: false,
        practice_complete: false,
        last_updated: '2024-01-10T11:00:00Z'
      },
      is_published: false,
      is_guest_speaker: false,
      speaker_notes: 'Focus on relatability of biblical characters',
      tech_notes: 'Create visual timeline of faith heroes',
      music_notes: 'Use "Faith of Our Fathers" during offering',
      view_count: 5,
      last_viewed: '2024-01-11T10:15:00Z',
      created_by: users[1].id
    }
  ]).returning(['id', 'title']);

  // Sample media resources
  await knex('media_resources').insert([
    {
      id: 'k23e4567-e89b-12d3-a456-426614174019',
      workspace_id: workspace.id,
      sermon_id: sermons[0].id,
      title: 'What is Faith? - Sermon Slides',
      description: 'PowerPoint slides for the "What is Faith?" sermon',
      resource_type: 'slides',
      filename: 'what-is-faith-slides.pptx',
      file_path: '/uploads/sermons/2024/what-is-faith-slides.pptx',
      file_size: 2048576,
      mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      tags: ['slides', 'faith', 'presentation'],
      display_order: 1,
      is_public: false,
      access_level: 'workspace',
      processing_status: 'completed',
      uploaded_by: users[0].id
    },
    {
      id: 'l23e4567-e89b-12d3-a456-426614174020',
      workspace_id: workspace.id,
      sermon_id: sermons[0].id,
      title: 'Faith Study Guide',
      description: 'Small group study guide for the faith series',
      resource_type: 'handout',
      filename: 'faith-study-guide.pdf',
      file_path: '/uploads/resources/faith-study-guide.pdf',
      file_size: 1024768,
      mime_type: 'application/pdf',
      tags: ['study guide', 'small group', 'faith'],
      display_order: 2,
      is_public: true,
      access_level: 'public',
      processing_status: 'completed',
      uploaded_by: users[0].id
    },
    {
      id: 'm23e4567-e89b-12d3-a456-426614174021',
      workspace_id: workspace.id,
      series_id: series[0].id,
      title: 'Foundations of Faith Series Artwork',
      description: 'Main graphic for the Foundations of Faith series',
      resource_type: 'image',
      filename: 'foundations-faith-artwork.jpg',
      file_path: '/uploads/series/foundations-faith-artwork.jpg',
      file_size: 512384,
      mime_type: 'image/jpeg',
      tags: ['artwork', 'series', 'graphics'],
      display_order: 1,
      is_public: true,
      access_level: 'public',
      processing_status: 'completed',
      processing_metadata: {
        width: 1920,
        height: 1080,
        format: 'JPEG'
      },
      uploaded_by: users[2].id
    }
  ]);

  // Sample collaborators
  await knex('collaborators').insert([
    {
      id: 'n23e4567-e89b-12d3-a456-426614174022',
      workspace_id: workspace.id,
      user_id: users[0].id,
      role: 'owner',
      collaboration_type: 'workspace_member',
      permissions: {
        can_view: true,
        can_edit: true,
        can_delete: true,
        can_publish: true,
        can_invite: true,
        can_manage_resources: true,
        can_export: true
      },
      assignment_status: 'active',
      is_accepted: true,
      accepted_at: '2023-12-01T10:00:00Z',
      invited_by: users[0].id
    },
    {
      id: 'o23e4567-e89b-12d3-a456-426614174023',
      workspace_id: workspace.id,
      user_id: users[1].id,
      role: 'editor',
      collaboration_type: 'workspace_member',
      permissions: {
        can_view: true,
        can_edit: true,
        can_delete: false,
        can_publish: true,
        can_invite: false,
        can_manage_resources: true,
        can_export: true
      },
      assignment_status: 'active',
      is_accepted: true,
      accepted_at: '2023-12-01T10:30:00Z',
      invited_by: users[0].id
    },
    {
      id: 'p23e4567-e89b-12d3-a456-426614174024',
      workspace_id: workspace.id,
      user_id: users[2].id,
      sermon_id: sermons[0].id,
      role: 'contributor',
      collaboration_type: 'sermon_collaborator',
      assignment_title: 'Music Coordination',
      assignment_description: 'Coordinate worship music for the What is Faith sermon',
      assignment_start_date: '2024-01-01',
      assignment_end_date: '2024-01-07',
      permissions: {
        can_view: true,
        can_edit: true,
        can_delete: false,
        can_publish: false,
        can_invite: false,
        can_manage_resources: false,
        can_export: false
      },
      assignment_status: 'completed',
      is_accepted: true,
      accepted_at: '2024-01-01T09:00:00Z',
      invited_by: users[0].id
    }
  ]);

  // Sample theme associations
  await knex('sermon_themes').insert([
    {
      sermon_id: sermons[0].id,
      theme_id: themes[0].id, // Faith theme
      is_primary_theme: true,
      relevance_score: 10,
      connection_notes: 'This sermon directly defines and explores biblical faith'
    },
    {
      sermon_id: sermons[1].id,
      theme_id: themes[0].id, // Faith theme
      is_primary_theme: true,
      relevance_score: 9,
      connection_notes: 'Demonstrates practical application of faith through works'
    },
    {
      sermon_id: sermons[2].id,
      theme_id: themes[0].id, // Faith theme
      is_primary_theme: true,
      relevance_score: 10,
      connection_notes: 'Showcases biblical examples of faith in action'
    }
  ]);

  await knex('series_themes').insert([
    {
      series_id: series[0].id,
      theme_id: themes[0].id, // Faith theme
      is_primary_theme: true,
      emphasis_level: 5,
      series_connection: 'The entire series is built around developing and understanding faith'
    },
    {
      series_id: series[1].id,
      theme_id: themes[1].id, // Hope theme
      is_primary_theme: true,
      emphasis_level: 5,
      series_connection: 'Easter series emphasizing hope of resurrection'
    },
    {
      series_id: series[1].id,
      theme_id: themes[3].id, // Grace theme
      is_primary_theme: false,
      emphasis_level: 4,
      series_connection: 'Grace demonstrated through Christ\'s sacrifice'
    }
  ]);

  // Sample export history
  await knex('export_history').insert([
    {
      id: 'q23e4567-e89b-12d3-a456-426614174025',
      workspace_id: workspace.id,
      requested_by: users[0].id,
      export_name: 'Q1 2024 Sermon Calendar',
      export_format: 'pdf',
      export_type: 'sermon_calendar',
      date_range_start: '2024-01-01',
      date_range_end: '2024-03-31',
      included_series_ids: [series[0].id, series[1].id],
      include_resources: false,
      template_name: 'quarterly_calendar',
      status: 'completed',
      progress_percentage: 100,
      started_at: '2024-01-15T09:00:00Z',
      completed_at: '2024-01-15T09:02:30Z',
      processing_time_seconds: 150,
      file_path: '/exports/q1-2024-sermon-calendar.pdf',
      file_size_bytes: 1536000,
      total_records: 15,
      download_count: 3,
      last_downloaded: '2024-01-16T14:30:00Z'
    }
  ]);

  console.log('✅ Sample data seeded successfully!');
  console.log(`📊 Created:
    • 1 Organization: ${organization.name}
    • 1 Workspace: ${workspace.name}
    • ${users.length} Users
    • ${themes.length} Themes  
    • ${series.length} Series
    • ${sermons.length} Sermons
    • 3 Media Resources
    • 3 Collaborators
    • 6 Theme Associations
    • 1 Export Record`);
}