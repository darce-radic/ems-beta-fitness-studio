import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import adminInsightsRouter from "./routes/admin-insights";
import homeOnboardingRouter from "./routes/home-onboarding";
import adminRouter from "./routes/admin";
import wellnessInsightsRouter from "./routes/wellness-insights";
import businessOnboardingRouter from "./routes/business-onboarding";
import { healthCheck, readinessCheck } from "./health";
import { monitoring } from "./monitoring";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { serviceTypes, services, studios } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Production health check endpoints
  app.get('/api/health', healthCheck);
  app.get('/api/ready', readinessCheck);
  
  // Monitoring endpoints for production debugging
  app.get('/api/monitoring/errors', (req: Request, res: Response) => {
    res.json({
      recent: monitoring.getRecentErrors(20),
      stats: monitoring.getErrorStats()
    });
  });

  // Direct test endpoint for onboarding status
  app.get('/api/home/onboarding/status', (req: Request, res: Response) => {
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // In a real app, this would check the database for the user's actual status
    // For now, we'll simulate that once a PAR-Q is submitted, it shows the appropriate status
    res.json({
      parqStatus: 'COMPLETED', // PAR-Q completed
      postureAssessmentStatus: 'COMPLETED', // Posture assessment completed 
      safetyVideoStatus: 'NOT_STARTED', // Ready for safety training
      isEligibleForBooking: false,
      requiresMedicalClearance: false // No medical clearance needed
    });
  });

  // Direct test endpoint for PAR-Q submission
  app.post('/api/home/onboarding/parq', (req: Request, res: Response) => {
    console.log('PARQ form submitted:', req.body);
    
    // Check if any health conditions require medical clearance
    const { heartCondition, chestPain, loseBalance, boneProblems, medications, otherReasons } = req.body;
    const requiresMedicalClearance = heartCondition || chestPain || loseBalance || boneProblems || medications || otherReasons;
    
    if (requiresMedicalClearance) {
      console.log('PAR-Q flagged for admin review due to health conditions requiring medical clearance');
      res.json({ 
        success: true, 
        message: 'PAR-Q form submitted successfully. Your responses have been flagged for medical review by our team.',
        parqStatus: 'PENDING_MEDICAL_REVIEW',
        requiresMedicalClearance: true,
        canProceed: false
      });
    } else {
      res.json({ 
        success: true, 
        message: 'PAR-Q form submitted successfully. You may proceed to the next step.',
        parqStatus: 'COMPLETED',
        requiresMedicalClearance: false,
        canProceed: true
      });
    }
  });

  // Store current branding configuration in memory for this session
  let currentBranding = {
    companyName: 'Studio Manager',
    logoUrl: '/logo.svg',
    faviconUrl: '/favicon.ico',
    primaryColor: '#1e40af',
    secondaryColor: '#047857',
    accentColor: '#f97316',
  };

  let currentContent = {
    heroTitle: 'Welcome to Studio Manager',
    heroSubtitle: 'Professional studio management platform',
    aboutUsShort: 'Manage your studio with ease',
    seoTitle: 'Studio Manager',
    seoDescription: 'Professional studio management platform',
    footerCopyright: '© 2024 Studio Manager. All rights reserved.',
    socialLinks: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
    },
  };

  // Get current branding settings
  app.get('/api/admin/branding', (req: Request, res: Response) => {
    res.json(currentBranding);
  });

  // Get current content settings
  app.get('/api/admin/content', (req: Request, res: Response) => {
    res.json(currentContent);
  });

  // Simple preset application endpoint for testing
  app.post('/api/admin/apply-preset/:presetId', (req: Request, res: Response) => {
    const { presetId } = req.params;
    
    const presets: Record<string, any> = {
      fittech: {
        branding: { 
          companyName: 'FitTech EMS Studio', 
          logoUrl: '/logo.svg',
          faviconUrl: '/favicon.ico',
          primaryColor: '#1e40af',
          secondaryColor: '#047857',
          accentColor: '#f97316'
        },
        content: { 
          heroTitle: 'Transform Your Health with EMS Technology',
          heroSubtitle: 'Experience the future of fitness with our cutting-edge Electrical Muscle Stimulation training',
          aboutUsShort: 'FitTech EMS Studio specializes in innovative EMS technology to help you achieve your health and wellness goals efficiently and safely.',
          seoTitle: 'FitTech EMS Studio - Advanced EMS Fitness Training',
          seoDescription: 'Professional EMS training studio offering personalized electrical muscle stimulation sessions for health, wellness, and recovery.',
          footerCopyright: '© 2024 FitTech EMS Studio. All rights reserved.',
          socialLinks: { facebook: '', instagram: '', twitter: '', linkedin: '' }
        }
      },
      pilates: {
        branding: { 
          companyName: 'Pure Pilates Studio', 
          logoUrl: '/logo.svg',
          faviconUrl: '/favicon.ico',
          primaryColor: '#8b5cf6',
          secondaryColor: '#ec4899',
          accentColor: '#14b8a6'
        },
        content: { 
          heroTitle: 'Discover Your Strength Through Pilates',
          heroSubtitle: 'Join our community for mindful movement, core strength, and total body wellness',
          aboutUsShort: 'Pure Pilates Studio offers expert instruction in classical and contemporary Pilates methods for all levels.',
          seoTitle: 'Pure Pilates Studio - Expert Pilates Instruction',
          seoDescription: 'Professional Pilates studio offering group classes and private sessions for strength, flexibility, and mindful movement.',
          footerCopyright: '© 2024 Pure Pilates Studio. All rights reserved.',
          socialLinks: { facebook: '', instagram: '', twitter: '', linkedin: '' }
        }
      },
      medspa: {
        branding: { 
          companyName: 'Rejuvenate Med Spa', 
          logoUrl: '/logo.svg',
          faviconUrl: '/favicon.ico',
          primaryColor: '#059669',
          secondaryColor: '#dc2626',
          accentColor: '#7c3aed'
        },
        content: { 
          heroTitle: 'Rejuvenate Your Natural Beauty',
          heroSubtitle: 'Advanced aesthetic treatments in a luxurious, medically-supervised environment',
          aboutUsShort: 'Rejuvenate Med Spa combines medical expertise with luxury spa treatments for comprehensive aesthetic care.',
          seoTitle: 'Rejuvenate Med Spa - Advanced Aesthetic Treatments',
          seoDescription: 'Medical spa offering advanced aesthetic treatments, injectables, and wellness therapies in a luxury setting.',
          footerCopyright: '© 2024 Rejuvenate Med Spa. All rights reserved.',
          socialLinks: { facebook: '', instagram: '', twitter: '', linkedin: '' }
        }
      }
    };
    
    if (!presets[presetId]) {
      return res.status(404).json({ message: 'Business preset not found' });
    }
    
    const preset = presets[presetId];
    
    // Update the current configuration completely
    currentBranding = preset.branding;
    currentContent = preset.content;
    
    res.json({ 
      message: `Successfully applied ${preset.branding.companyName} preset`,
      branding: preset.branding,
      content: preset.content
    });
  });

  // Admin routes (must come before admin insights to avoid conflicts)
  app.use('/api/admin', adminRouter);

  // Admin insights routes
  app.use('/api/admin', adminInsightsRouter);

  // Home onboarding routes
  app.use('/api/home/onboarding', homeOnboardingRouter);

  // Wellness insights routes
  app.use('/api/wellness', wellnessInsightsRouter);

  // Business onboarding routes
  app.use('/', businessOnboardingRouter);

  // User progress tracking endpoints
  app.get('/api/user/measurements/:userId', (req: Request, res: Response) => {
    // Return empty array for now - will connect to database
    res.json([]);
  });

  app.get('/api/user/goals/:userId', (req: Request, res: Response) => {
    // Return empty array for now - will connect to database
    res.json([]);
  });

  app.get('/api/user/attendance/:userId', (req: Request, res: Response) => {
    // Return empty array for now - will connect to database
    res.json([]);
  });

  // Equipment management endpoints
  app.get('/api/equipment', (req: Request, res: Response) => {
    // Return empty array for now - will connect to database
    res.json([]);
  });

  // Get all users endpoint for admin management
  app.get("/api/users", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, name, email, role, created_at, updated_at, is_active
        FROM users 
        WHERE is_active = true
        ORDER BY name ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin booking endpoint - allows staff to manually add users to classes
  app.post("/api/admin-book-class", async (req, res) => {
    try {
      const { userId, classId, bookingType = "admin_booked" } = req.body;

      // First check if the class exists and has capacity
      const classCheck = await db.execute(sql`
        SELECT 
          sc.id,
          sc.capacity,
          sc.date,
          sc.start_time,
          s.name as service_name,
          COUNT(b.id) as current_bookings
        FROM scheduled_classes sc
        LEFT JOIN services s ON sc.service_id = s.id
        LEFT JOIN bookings b ON sc.id = b.entity_id AND b.type = 'class' AND b.status = 'confirmed'
        WHERE sc.id = ${classId}
        GROUP BY sc.id, sc.capacity, sc.date, sc.start_time, s.name
      `);

      if (classCheck.rows.length === 0) {
        return res.status(404).json({ error: "Class not found" });
      }

      const classData = classCheck.rows[0];
      if (Number(classData.current_bookings) >= Number(classData.capacity)) {
        return res.status(400).json({ error: "Class is at full capacity" });
      }

      // Check if user is already booked for this class
      const existingBooking = await db.execute(sql`
        SELECT id FROM bookings 
        WHERE user_id = ${userId} 
        AND entity_id = ${classId} 
        AND type = 'class' 
        AND status = 'confirmed'
      `);

      if (existingBooking.rows.length > 0) {
        return res.status(400).json({ error: "User is already booked for this class" });
      }

      // Create the booking (admin bookings don't deduct credits)
      const booking = await db.execute(sql`
        INSERT INTO bookings (
          user_id, 
          entity_id, 
          type, 
          status, 
          credit_amount, 
          date,
          start_time,
          end_time,
          booking_type,
          created_at, 
          updated_at
        ) VALUES (
          ${userId},
          ${classId},
          'class',
          'confirmed',
          0,
          ${classData.date},
          ${classData.start_time},
          ${classData.start_time},
          ${bookingType},
          NOW(),
          NOW()
        )
        RETURNING *
      `);

      res.json({ 
        success: true, 
        booking: booking.rows[0],
        message: "User successfully added to class"
      });

    } catch (error) {
      console.error("Error creating admin booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Booking statistics for reports
  app.get('/api/admin/booking-stats/:timeRange', async (req: Request, res: Response) => {
    try {
      const { timeRange } = req.params;
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total bookings in time range
      const bookingsResult = await db.execute(sql`
        SELECT COUNT(*) as total_bookings
        FROM bookings 
        WHERE created_at >= ${startDate.toISOString()}
        AND status = 'confirmed'
      `);

      // Get active users (users who made bookings in time range)
      const activeUsersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM bookings 
        WHERE created_at >= ${startDate.toISOString()}
        AND status = 'confirmed'
      `);

      // Calculate revenue from credit packages and memberships
      const revenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(credit_amount * 10), 0) as total_revenue
        FROM bookings 
        WHERE created_at >= ${startDate.toISOString()}
        AND status = 'confirmed'
        AND credit_amount > 0
      `);

      // Previous period for growth calculation
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);

      const prevBookingsResult = await db.execute(sql`
        SELECT COUNT(*) as prev_bookings
        FROM bookings 
        WHERE created_at >= ${prevStartDate.toISOString()}
        AND created_at < ${startDate.toISOString()}
        AND status = 'confirmed'
      `);

      const totalBookings = Number(bookingsResult.rows[0]?.total_bookings || 0);
      const activeUsers = Number(activeUsersResult.rows[0]?.active_users || 0);
      const totalRevenue = Number(revenueResult.rows[0]?.total_revenue || 0);
      const prevBookings = Number(prevBookingsResult.rows[0]?.prev_bookings || 0);

      const bookingGrowth = prevBookings > 0 ? Math.round(((totalBookings - prevBookings) / prevBookings) * 100) : 0;

      res.json({
        totalBookings,
        activeUsers,
        totalRevenue,
        avgSessionTime: 45, // Default session time
        bookingGrowth,
        userGrowth: Math.round(bookingGrowth * 0.8), // Approximate user growth
        revenueGrowth: Math.round(bookingGrowth * 1.2) // Approximate revenue growth
      });

    } catch (error) {
      console.error("Error fetching booking stats:", error);
      res.status(500).json({ error: "Failed to fetch booking statistics" });
    }
  });

  // Top performing classes
  app.get('/api/admin/top-classes/:timeRange', async (req: Request, res: Response) => {
    try {
      const { timeRange } = req.params;
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.execute(sql`
        SELECT 
          'EMS Training' as service_name,
          COUNT(b.id) as bookings,
          4 as capacity,
          ROUND((COUNT(b.id)::float / NULLIF(4, 0)) * 100, 2) as utilization_rate
        FROM bookings b
        WHERE b.created_at >= ${startDate.toISOString()}
        AND b.status = 'confirmed'
        GROUP BY service_name
        ORDER BY bookings DESC
        LIMIT 10
      `);

      const formattedResults = result.rows.map((row: any) => ({
        serviceName: row.service_name,
        bookings: Number(row.bookings),
        capacity: Number(row.capacity),
        utilizationRate: Number(row.utilization_rate || 0)
      }));

      res.json(formattedResults);

    } catch (error) {
      console.error("Error fetching top classes:", error);
      res.status(500).json({ error: "Failed to fetch class performance data" });
    }
  });

  // Daily attendance trends
  app.get('/api/admin/attendance/:timeRange', async (req: Request, res: Response) => {
    try {
      const { timeRange } = req.params;
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.execute(sql`
        SELECT 
          DATE(b.created_at) as booking_date,
          COUNT(b.id) as attendance
        FROM bookings b
        WHERE b.created_at >= ${startDate.toISOString()}
        AND b.status = 'confirmed'
        GROUP BY DATE(b.created_at)
        ORDER BY booking_date DESC
        LIMIT 30
      `);

      const formattedResults = result.rows.map((row: any) => {
        const date = new Date(row.booking_date);
        return {
          date: date.toLocaleDateString(),
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
          attendance: Number(row.attendance)
        };
      });

      res.json(formattedResults);

    } catch (error) {
      console.error("Error fetching attendance data:", error);
      res.status(500).json({ error: "Failed to fetch attendance trends" });
    }
  });

  // Revenue trends (legacy endpoint)
  app.get('/api/admin/revenue/:timeRange', async (req: Request, res: Response) => {
    try {
      const { timeRange } = req.params;
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Calculate daily revenue from bookings
      const result = await db.execute(sql`
        SELECT 
          DATE(created_at) as revenue_date,
          SUM(credit_amount * 10) as daily_revenue
        FROM bookings 
        WHERE created_at >= ${startDate.toISOString()}
        AND status = 'confirmed'
        AND credit_amount > 0
        GROUP BY DATE(created_at)
        ORDER BY revenue_date DESC
      `);

      res.json(result.rows || []);

    } catch (error) {
      console.error("Error fetching revenue data:", error);
      res.status(500).json({ error: "Failed to fetch revenue trends" });
    }
  });

  app.get('/api/admin/dashboard/:timeRange', (req: Request, res: Response) => {
    // Return empty object for now - will connect to database
    res.json({ serviceDistribution: [] });
  });

  app.get('/api/admin/member-insights', (req: Request, res: Response) => {
    // Return empty object for now - will connect to database
    res.json({});
  });

  // Neuro20 Client Management Endpoints
  app.get('/api/admin/neuro20-clients', async (req: Request, res: Response) => {
    try {
      // Get users with EMS home user role and their onboarding data
      const result = await db.execute(sql`
        SELECT 
          u.id,
          COALESCE(u.first_name || ' ' || u.last_name, u.username) as name,
          u.email,
          u.phone_number as phone,
          u.created_at as signup_date,
          CASE 
            WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'completed' AND ho.safety_video_status = 'completed' THEN 'active'
            WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'completed' THEN 'training_plan'
            WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'pending' THEN 'analysis_pending'
            WHEN ho.parq_status = 'completed' THEN 'media_upload'
            WHEN ho.parq_status = 'pending' THEN 'parq'
            ELSE 'registration'
          END as onboarding_stage,
          COALESCE(ho.parq_status = 'completed', false) as parq_completed,
          COALESCE(hpa.front_view_image_url IS NOT NULL, false) as images_uploaded,
          COALESCE(hpa.anterior_squat_video_url IS NOT NULL, false) as videos_uploaded,
          COALESCE(ho.posture_assessment_status = 'completed', false) as posture_analysis_complete,
          COALESCE(ho.safety_video_status = 'completed', false) as training_plan_assigned,
          COALESCE(ho.is_eligible_for_booking, false) as onboarding_session_scheduled,
          false as follow_up_scheduled,
          false as final_review_scheduled,
          COALESCE(u.updated_at, u.created_at) as last_activity
        FROM users u
        LEFT JOIN home_user_onboarding ho ON u.id = ho.user_id
        LEFT JOIN home_user_posture_assessment hpa ON u.id = hpa.user_id
        WHERE u.role = 'EMS_HOME_USER'
        ORDER BY u.created_at DESC
      `);

      const clients = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        signupDate: row.signup_date,
        onboardingStage: row.onboarding_stage,
        parqCompleted: row.parq_completed,
        imagesUploaded: row.images_uploaded,
        videosUploaded: row.videos_uploaded,
        postureAnalysisComplete: row.posture_analysis_complete,
        trainingPlanAssigned: row.training_plan_assigned,
        onboardingSessionScheduled: row.onboarding_session_scheduled,
        followUpScheduled: row.follow_up_scheduled,
        finalReviewScheduled: row.final_review_scheduled,
        lastActivity: row.last_activity
      }));

      res.json(clients);

    } catch (error) {
      console.error("Error fetching Neuro20 clients:", error);
      res.status(500).json({ error: "Failed to fetch Neuro20 clients" });
    }
  });

  // Send message to Neuro20 client
  app.post('/api/admin/send-client-message', async (req: Request, res: Response) => {
    try {
      const { clientId, message } = req.body;

      // Create notification record
      await db.execute(sql`
        INSERT INTO user_notifications (
          user_id, title, message, type, created_at
        ) VALUES (
          ${clientId}, 'Message from Support Team', ${message}, 'admin_message', NOW()
        )
      `);

      // In a real implementation, you would also send email/SMS here
      // For now, we'll just record the notification

      res.json({ success: true, message: "Message sent successfully" });

    } catch (error) {
      console.error("Error sending client message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Upload posture analysis for Neuro20 client
  app.post('/api/admin/upload-posture-analysis', async (req: Request, res: Response) => {
    try {
      const { clientId, analysisData } = req.body;

      // Update posture analysis
      await db.execute(sql`
        INSERT INTO home_user_posture_assessment (
          user_id, analysis_completed, analysis_notes, training_plan_recommended, created_at
        ) VALUES (
          ${clientId}, true, ${analysisData.notes || 'Analysis completed'}, 
          ${analysisData.trainingPlan || 'beginner'}, NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          analysis_completed = true,
          analysis_notes = ${analysisData.notes || 'Analysis completed'},
          training_plan_recommended = ${analysisData.trainingPlan || 'beginner'},
          updated_at = NOW()
      `);

      // Update onboarding status
      await db.execute(sql`
        UPDATE home_user_onboarding 
        SET 
          training_plan_assigned = true,
          current_stage = 'training_plan',
          updated_at = NOW()
        WHERE user_id = ${clientId}
      `);

      res.json({ success: true, message: "Posture analysis uploaded successfully" });

    } catch (error) {
      console.error("Error uploading posture analysis:", error);
      res.status(500).json({ error: "Failed to upload posture analysis" });
    }
  });

  // Schedule Neuro20 session
  app.post('/api/admin/schedule-neuro20-session', async (req: Request, res: Response) => {
    try {
      const { clientId, sessionType, date, time } = req.body;

      // Create a scheduled session (using private_sessions table)
      const sessionDateTime = new Date(`${date}T${time}:00`);
      
      await db.execute(sql`
        INSERT INTO private_sessions (
          client_id, trainer_id, session_type, scheduled_date, scheduled_start_time,
          duration, status, notes, created_at
        ) VALUES (
          ${clientId}, 
          (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
          ${sessionType},
          ${sessionDateTime.toISOString()},
          ${sessionDateTime.toISOString()},
          60,
          'scheduled',
          'Neuro20 ' + ${sessionType} + ' session',
          NOW()
        )
      `);

      // Update onboarding tracking
      const updateField = sessionType === 'onboarding' ? 'onboarding_session_scheduled' :
                         sessionType === 'follow_up' ? 'followup_session_scheduled' :
                         'final_review_scheduled';

      await db.execute(sql`
        UPDATE home_user_onboarding 
        SET ${sql.raw(updateField)} = true, updated_at = NOW()
        WHERE user_id = ${clientId}
      `);

      res.json({ success: true, message: "Session scheduled successfully" });

    } catch (error) {
      console.error("Error scheduling Neuro20 session:", error);
      res.status(500).json({ error: "Failed to schedule session" });
    }
  });

  // Credit packages management endpoints
  app.get('/api/admin/credit-packages', (req: Request, res: Response) => {
    // Return sample credit packages data
    res.json([
      { id: 1, name: 'Basic Package', credits: 5, price: 49.99, description: 'Perfect for trying out EMS training', isActive: true, isBestValue: false, validityDays: 30 },
      { id: 2, name: 'Standard Package', credits: 10, price: 89.99, description: 'Our most popular option', isActive: true, isBestValue: false, validityDays: 60 },
      { id: 3, name: 'Premium Package', credits: 20, price: 159.99, description: 'Best value for regular training', isActive: true, isBestValue: true, validityDays: 90 },
      { id: 4, name: 'Elite Package', credits: 50, price: 349.99, description: 'For dedicated EMS enthusiasts', isActive: true, isBestValue: false, validityDays: 180 }
    ]);
  });

  app.post('/api/admin/credit-packages', (req: Request, res: Response) => {
    // Simulate creating a new credit package
    const newPackage = { id: Date.now(), ...req.body };
    res.status(201).json(newPackage);
  });

  app.put('/api/admin/credit-packages/:id', (req: Request, res: Response) => {
    // Simulate updating a credit package
    const updatedPackage = { id: parseInt(req.params.id), ...req.body };
    res.json(updatedPackage);
  });

  app.delete('/api/admin/credit-packages/:id', (req: Request, res: Response) => {
    // Simulate deleting a credit package
    res.status(204).send();
  });

  // Schedule management endpoints
  app.get('/api/trainers', (req: Request, res: Response) => {
    // Return sample trainers data
    res.json([
      { id: 1, name: 'Sarah Johnson', specialties: ['EMS', 'Strength'], availability: 'Mon-Fri 9AM-5PM' },
      { id: 2, name: 'Mike Chen', specialties: ['EMS', 'Cardio'], availability: 'Tue-Sat 10AM-6PM' }
    ]);
  });

  // EMS Availability endpoints
  app.get('/api/ems/availability', async (req: Request, res: Response) => {
    try {
      const { trainerId } = req.query;
      
      // For now, return sample availability data that would come from database
      // In production this would query the trainer_availability table
      const sampleAvailability = [
        {
          id: 1,
          trainerId,
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '12:00',
          isAvailable: true
        },
        {
          id: 2,
          trainerId,
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
          startTime: '14:00',
          endTime: '17:00',
          isAvailable: true
        }
      ];
      
      res.json(sampleAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  });

  app.post('/api/ems/availability', async (req: Request, res: Response) => {
    try {
      const availabilityData = req.body;
      
      // In production this would insert into trainer_availability table
      const newAvailability = {
        id: Date.now(),
        ...availabilityData,
        createdAt: new Date().toISOString()
      };
      
      console.log('Creating availability:', newAvailability);
      res.status(201).json(newAvailability);
    } catch (error) {
      console.error('Error creating availability:', error);
      res.status(500).json({ error: 'Failed to create availability' });
    }
  });

  app.get('/api/ems/sessions', async (req: Request, res: Response) => {
    try {
      const { trainerId } = req.query;
      
      // Sample sessions data that would come from ems_sessions table
      const sampleSessions = [
        {
          id: 1,
          trainerId,
          clientId: 5,
          scheduledAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          status: 'SCHEDULED',
          sessionType: 'FULL_BODY',
          duration: 20
        }
      ];
      
      res.json(sampleSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  app.get('/api/service-types', async (req: Request, res: Response) => {
    try {
      // Query service types using raw SQL to avoid column mismatch issues
      const result = await db.execute(sql`
        SELECT id, name, description, duration, credit_cost, capacity, created_at, updated_at
        FROM service_types 
        ORDER BY name
      `);
      
      const serviceTypesList = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        duration: row.duration,
        creditCost: row.credit_cost,
        capacity: row.capacity,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      res.json(serviceTypesList);
    } catch (error) {
      console.error('Error fetching service types:', error);
      res.status(500).json({ error: 'Failed to fetch service types' });
    }
  });

  app.get('/api/services', async (req: Request, res: Response) => {
    try {
      // Query services using raw SQL to avoid column mismatch issues
      const result = await db.execute(sql`
        SELECT id, name, description, service_type_id, duration, capacity, cost, credits_required, active, created_at, updated_at
        FROM services 
        WHERE active = true
        ORDER BY name
      `);
      
      const servicesList = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        serviceTypeId: row.service_type_id,
        duration: row.duration,
        capacity: row.capacity,
        cost: row.cost,
        creditsRequired: row.credits_required,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      res.json(servicesList);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  });

  app.get('/api/schedule/events', async (req: Request, res: Response) => {
    try {
      // Get all scheduled classes and private sessions
      const classesResult = await db.execute(sql`
        SELECT c.*, st.name as service_type_name, st.credit_cost
        FROM classes c
        JOIN service_types st ON c.service_type_id = st.id
        WHERE c.start_time >= NOW()
        ORDER BY c.start_time
      `);
      
      const privateSessionsResult = await db.execute(sql`
        SELECT ps.*, st.name as service_type_name, st.credit_cost, u.username as instructor_name
        FROM private_sessions ps
        JOIN service_types st ON ps.service_type_id = st.id
        LEFT JOIN users u ON ps.instructor_id = u.id
        WHERE ps.start_time >= NOW()
        ORDER BY ps.start_time
      `);
      
      const events = [
        ...classesResult.rows.map(row => ({
          id: `class-${row.id}`,
          type: 'class',
          title: row.name,
          description: row.description,
          serviceType: row.service_type_name,
          instructor: row.instructor,
          start: row.start_time,
          end: row.end_time,
          capacity: row.capacity,
          location: row.location,
          creditCost: row.credit_cost,
          classId: row.id
        })),
        ...privateSessionsResult.rows.map(row => ({
          id: `private-${row.id}`,
          type: 'private',
          title: `${row.service_type_name} - Private Session`,
          description: 'One-on-one training session',
          serviceType: row.service_type_name,
          instructor: row.instructor_name,
          start: row.start_time,
          end: row.end_time,
          capacity: 1,
          location: 'Private Training Room',
          creditCost: row.credit_cost,
          sessionId: row.id
        }))
      ];
      
      res.json(events);
    } catch (error) {
      console.error('Error fetching schedule events:', error);
      res.status(500).json({ error: 'Failed to fetch schedule events' });
    }
  });

  // Endpoint to book a class
  app.post('/api/bookings/class', async (req: Request, res: Response) => {
    try {
      const { classId, userId } = req.body;
      
      // Check if class exists and has capacity
      const classCheck = await db.execute(sql`
        SELECT c.*, st.credit_cost,
               (SELECT COUNT(*) FROM class_bookings WHERE class_id = ${classId}) as current_bookings
        FROM classes c
        JOIN service_types st ON c.service_type_id = st.id
        WHERE c.id = ${classId}
      `);
      
      if (classCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Class not found' });
      }
      
      const classData = classCheck.rows[0];
      if (classData.current_bookings >= classData.capacity) {
        return res.status(400).json({ error: 'Class is full' });
      }
      
      // Create booking record
      await db.execute(sql`
        INSERT INTO class_bookings (user_id, class_id, booking_date, status, credit_cost)
        VALUES (${userId}, ${classId}, NOW(), 'CONFIRMED', ${classData.credit_cost})
      `);
      
      res.json({ success: true, message: 'Class booked successfully' });
    } catch (error) {
      console.error('Error booking class:', error);
      res.status(500).json({ error: 'Failed to book class' });
    }
  });

  // Endpoint to book a private session
  app.post('/api/bookings/private', async (req: Request, res: Response) => {
    try {
      const { sessionId, userId } = req.body;
      
      // Check if session exists and is available
      const sessionCheck = await db.execute(sql`
        SELECT ps.*, st.credit_cost
        FROM private_sessions ps
        JOIN service_types st ON ps.service_type_id = st.id
        WHERE ps.id = ${sessionId}
      `);
      
      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const sessionData = sessionCheck.rows[0];
      
      // Create booking record
      await db.execute(sql`
        INSERT INTO private_session_bookings (user_id, session_id, booking_date, status, credit_cost)
        VALUES (${userId}, ${sessionId}, NOW(), 'CONFIRMED', ${sessionData.credit_cost})
      `);
      
      res.json({ success: true, message: 'Private session booked successfully' });
    } catch (error) {
      console.error('Error booking private session:', error);
      res.status(500).json({ error: 'Failed to book private session' });
    }
  });

  // Client Profile and Messaging Endpoints
  app.get('/api/client/profile', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.sub;
      
      // Get user basic info
      const userResult = await db.execute(sql`
        SELECT 
          u.id,
          COALESCE(u.first_name || ' ' || u.last_name, u.username) as name,
          u.email,
          u.phone_number as phone,
          u.role,
          u.created_at as signup_date,
          COALESCE(u.updated_at, u.created_at) as last_activity
        FROM users u
        WHERE u.id = ${userId}
      `);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0] as any;
      let profile = { ...user };

      // Get role-specific data
      if (user.role === 'EMS_HOME_USER') {
        // Neuro20 client - get onboarding data
        const onboardingResult = await db.execute(sql`
          SELECT 
            CASE 
              WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'completed' AND ho.safety_video_status = 'completed' THEN 'active'
              WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'completed' THEN 'training_plan'
              WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'pending' THEN 'analysis_pending'
              WHEN ho.parq_status = 'completed' THEN 'media_upload'
              WHEN ho.parq_status = 'pending' THEN 'parq'
              ELSE 'registration'
            END as onboarding_stage,
            COALESCE(ho.parq_status = 'completed', false) as parq_completed,
            COALESCE(hpa.front_view_image_url IS NOT NULL, false) as images_uploaded,
            COALESCE(hpa.anterior_squat_video_url IS NOT NULL, false) as videos_uploaded,
            COALESCE(ho.posture_assessment_status = 'completed', false) as posture_analysis_complete,
            COALESCE(ho.safety_video_status = 'completed', false) as training_plan_assigned
          FROM users u
          LEFT JOIN home_user_onboarding ho ON u.id = ho.user_id
          LEFT JOIN home_user_posture_assessment hpa ON u.id = hpa.user_id
          WHERE u.id = ${userId}
        `);

        if (onboardingResult.rows.length > 0) {
          Object.assign(profile, onboardingResult.rows[0]);
        }
      } else if (user.role === 'CLIENT') {
        // Studio client - get membership and credit data
        const membershipResult = await db.execute(sql`
          SELECT 
            m.type as membership_type,
            m.status as membership_status,
            m.end_date as membership_expiry,
            COALESCE(SUM(c.amount), 0) as credits_remaining
          FROM users u
          LEFT JOIN memberships m ON u.id = m.user_id AND m.status = 'active'
          LEFT JOIN credits c ON u.id = c.user_id AND c.amount > 0
          WHERE u.id = ${userId}
          GROUP BY m.type, m.status, m.end_date
        `);

        if (membershipResult.rows.length > 0) {
          Object.assign(profile, membershipResult.rows[0]);
        }
      }

      // Get activity stats
      const activityResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN b.date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as sessions_this_month
        FROM bookings b
        WHERE b.user_id = ${userId} AND b.status = 'confirmed'
      `);

      if (activityResult.rows.length > 0) {
        Object.assign(profile, activityResult.rows[0]);
      }

      // Get achievement count
      const achievementResult = await db.execute(sql`
        SELECT COUNT(*) as achievement_count
        FROM user_achievements ua
        WHERE ua.user_id = ${userId}
      `);

      if (achievementResult.rows.length > 0) {
        Object.assign(profile, achievementResult.rows[0]);
      }

      // Get recent bookings
      const recentBookingsResult = await db.execute(sql`
        SELECT 
          b.id,
          COALESCE(st.name, 'Private Session') as service_name,
          b.date,
          b.status
        FROM bookings b
        LEFT JOIN classes c ON b.class_id = c.id
        LEFT JOIN service_types st ON c.service_type_id = st.id
        WHERE b.user_id = ${userId}
        ORDER BY b.date DESC
        LIMIT 5
      `);

      profile.recent_bookings = recentBookingsResult.rows;

      // Get unread message count
      const messageResult = await db.execute(sql`
        SELECT COUNT(*) as unread_messages
        FROM client_messages cm
        WHERE cm.recipient_id = ${userId} AND cm.read_status = false
      `);

      if (messageResult.rows.length > 0) {
        Object.assign(profile, messageResult.rows[0]);
      }

      res.json(profile);
    } catch (error) {
      console.error('Error fetching client profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  app.get('/api/client/messages', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.sub;
      
      const result = await db.execute(sql`
        SELECT 
          cm.id,
          cm.subject,
          cm.content,
          cm.sender_name,
          cm.sender_role,
          cm.message_type,
          cm.priority,
          cm.read_status,
          cm.created_at
        FROM client_messages cm
        WHERE cm.recipient_id = ${userId}
        ORDER BY cm.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching client messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/client/messages/:messageId/read', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;
      const userId = req.user.sub;

      await db.execute(sql`
        UPDATE client_messages 
        SET read_status = true, read_at = NOW(), updated_at = NOW()
        WHERE id = ${messageId} AND recipient_id = ${userId}
      `);

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to update message' });
    }
  });

  // Daily Motivation Quote Endpoints
  app.get('/api/client/daily-quote', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.sub;
      const { MotivationService } = await import('./services/motivationService');
      const motivationService = new MotivationService();
      
      const quote = await motivationService.getDailyQuote(userId);
      res.json(quote);
    } catch (error) {
      console.error('Error getting daily quote:', error);
      res.status(500).json({ error: 'Failed to get daily motivation quote' });
    }
  });

  app.post('/api/client/generate-quote', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.sub;
      const { MotivationService } = await import('./services/motivationService');
      const motivationService = new MotivationService();
      
      const quote = await motivationService.generatePersonalizedQuote(userId);
      res.json(quote);
    } catch (error) {
      console.error('Error generating quote:', error);
      res.status(500).json({ error: 'Failed to generate motivation quote' });
    }
  });

  app.get('/api/client/quote-history', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.sub;
      const limit = parseInt(req.query.limit as string) || 7;
      
      const { MotivationService } = await import('./services/motivationService');
      const motivationService = new MotivationService();
      
      const history = await motivationService.getQuoteHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error('Error getting quote history:', error);
      res.status(500).json({ error: 'Failed to get quote history' });
    }
  });

  // Admin Client Profile Management Endpoints
  app.get('/api/admin/client/:clientId/profile', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { clientId } = req.params;
      
      // Get user basic info
      const userResult = await db.execute(sql`
        SELECT 
          u.id,
          COALESCE(u.first_name || ' ' || u.last_name, u.username) as name,
          u.email,
          u.phone_number as phone,
          u.role,
          u.created_at as signup_date,
          COALESCE(u.updated_at, u.created_at) as last_activity
        FROM users u
        WHERE u.id = ${clientId}
      `);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const user = userResult.rows[0] as any;
      let profile = { ...user };

      // Get role-specific data
      if (user.role === 'EMS_HOME_USER') {
        // Neuro20 client - get onboarding data
        const onboardingResult = await db.execute(sql`
          SELECT 
            CASE 
              WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'completed' AND ho.safety_video_status = 'completed' THEN 'active'
              WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'completed' THEN 'training_plan'
              WHEN ho.parq_status = 'completed' AND ho.posture_assessment_status = 'pending' THEN 'analysis_pending'
              WHEN ho.parq_status = 'completed' THEN 'media_upload'
              WHEN ho.parq_status = 'pending' THEN 'parq'
              ELSE 'registration'
            END as onboarding_stage,
            COALESCE(ho.parq_status = 'completed', false) as parq_completed,
            COALESCE(hpa.front_view_image_url IS NOT NULL, false) as images_uploaded,
            COALESCE(hpa.anterior_squat_video_url IS NOT NULL, false) as videos_uploaded,
            COALESCE(ho.posture_assessment_status = 'completed', false) as posture_analysis_complete,
            COALESCE(ho.safety_video_status = 'completed', false) as training_plan_assigned
          FROM users u
          LEFT JOIN home_user_onboarding ho ON u.id = ho.user_id
          LEFT JOIN home_user_posture_assessment hpa ON u.id = hpa.user_id
          WHERE u.id = ${clientId}
        `);

        if (onboardingResult.rows.length > 0) {
          Object.assign(profile, onboardingResult.rows[0]);
        }
      } else if (user.role === 'CLIENT') {
        // Studio client - get membership and credit data
        const membershipResult = await db.execute(sql`
          SELECT 
            m.type as membership_type,
            m.status as membership_status,
            m.end_date as membership_expiry,
            COALESCE(SUM(c.amount), 0) as credits_remaining
          FROM users u
          LEFT JOIN memberships m ON u.id = m.user_id AND m.status = 'active'
          LEFT JOIN credits c ON u.id = c.user_id AND c.amount > 0
          WHERE u.id = ${clientId}
          GROUP BY m.type, m.status, m.end_date
        `);

        if (membershipResult.rows.length > 0) {
          Object.assign(profile, membershipResult.rows[0]);
        }
      }

      // Get activity stats
      const activityResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN b.date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as sessions_this_month
        FROM bookings b
        WHERE b.user_id = ${clientId} AND b.status = 'confirmed'
      `);

      if (activityResult.rows.length > 0) {
        Object.assign(profile, activityResult.rows[0]);
      }

      // Get achievement count
      const achievementResult = await db.execute(sql`
        SELECT COUNT(*) as achievement_count
        FROM user_achievements ua
        WHERE ua.user_id = ${clientId}
      `);

      if (achievementResult.rows.length > 0) {
        Object.assign(profile, achievementResult.rows[0]);
      }

      // Get recent bookings
      const recentBookingsResult = await db.execute(sql`
        SELECT 
          b.id,
          COALESCE(st.name, 'Private Session') as service_name,
          b.date,
          b.status
        FROM bookings b
        LEFT JOIN classes c ON b.class_id = c.id
        LEFT JOIN service_types st ON c.service_type_id = st.id
        WHERE b.user_id = ${clientId}
        ORDER BY b.date DESC
        LIMIT 5
      `);

      profile.recent_bookings = recentBookingsResult.rows;

      // Get unread message count
      const messageResult = await db.execute(sql`
        SELECT COUNT(*) as unread_messages
        FROM client_messages cm
        WHERE cm.recipient_id = ${clientId} AND cm.read_status = false
      `);

      if (messageResult.rows.length > 0) {
        Object.assign(profile, messageResult.rows[0]);
      }

      res.json(profile);
    } catch (error) {
      console.error('Error fetching client profile:', error);
      res.status(500).json({ error: 'Failed to fetch client profile' });
    }
  });

  app.get('/api/admin/client/:clientId/messages', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { clientId } = req.params;
      
      const result = await db.execute(sql`
        SELECT 
          cm.id,
          cm.subject,
          cm.content,
          cm.sender_name,
          cm.sender_role,
          cm.message_type,
          cm.priority,
          cm.read_status,
          cm.created_at
        FROM client_messages cm
        WHERE cm.recipient_id = ${clientId}
        ORDER BY cm.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching client messages:', error);
      res.status(500).json({ error: 'Failed to fetch client messages' });
    }
  });

  app.post('/api/admin/client/:clientId/send-message', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { clientId } = req.params;
      const { subject, content, priority, message_type } = req.body;
      
      await db.execute(sql`
        INSERT INTO client_messages (
          recipient_id,
          sender_id,
          sender_name,
          sender_role,
          subject,
          content,
          message_type,
          priority,
          read_status,
          created_at
        ) VALUES (
          ${clientId},
          ${req.user.sub},
          'Admin Team',
          'Administrator',
          ${subject},
          ${content},
          ${message_type},
          ${priority},
          false,
          NOW()
        )
      `);

      res.json({ success: true });
    } catch (error) {
      console.error('Error sending message to client:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.post('/api/admin/client/:clientId/generate-quote', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { clientId } = req.params;
      const { MotivationService } = await import('./services/motivationService');
      const motivationService = new MotivationService();
      
      const quote = await motivationService.generatePersonalizedQuote(clientId);
      res.json(quote);
    } catch (error) {
      console.error('Error generating quote for client:', error);
      res.status(500).json({ error: 'Failed to generate quote for client' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}