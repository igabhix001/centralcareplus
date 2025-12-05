import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.body.read',
];

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/fit/oauth-callback`
  );
};

// Get Google OAuth URL
router.get('/auth-url', authenticate, async (req: Request, res: Response) => {
  try {
    const oauth2Client = getOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: req.user!.userId, // Pass user ID in state
      prompt: 'consent',
    });

    res.json({ success: true, data: { url: authUrl } });
  } catch (error) {
    console.error('Google Fit auth URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate auth URL' });
  }
});

// OAuth callback
router.get('/oauth-callback', async (req: Request, res: Response) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/health?error=missing_params`);
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in database
    const patient = await prisma.patient.findFirst({
      where: { userId: userId as string },
    });

    if (patient) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          googleFitToken: JSON.stringify(tokens),
        },
      });

      // Fetch initial data
      await fetchAndStoreGoogleFitData(patient.id, tokens);
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/health?connected=true`);
  } catch (error) {
    console.error('Google Fit callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/health?error=auth_failed`);
  }
});

// Get Google Fit data for current user
router.get('/data', authenticate, async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.user!.userId },
    });

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get stored data from database
    const fitData = await prisma.googleFitData.findMany({
      where: { patientId: patient.id },
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    });

    // If connected, try to fetch fresh data
    if (patient.googleFitToken) {
      try {
        const tokens = JSON.parse(patient.googleFitToken);
        await fetchAndStoreGoogleFitData(patient.id, tokens);
        
        // Return updated data
        const updatedData = await prisma.googleFitData.findMany({
          where: { patientId: patient.id },
          orderBy: { date: 'desc' },
          take: 30,
        });
        
        return res.json({ 
          success: true, 
          data: updatedData,
          connected: true,
        });
      } catch (refreshError) {
        console.error('Failed to refresh Google Fit data:', refreshError);
      }
    }

    res.json({ 
      success: true, 
      data: fitData,
      connected: !!patient.googleFitToken,
    });
  } catch (error) {
    console.error('Get Google Fit data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch health data' });
  }
});

// Disconnect Google Fit
router.post('/disconnect', authenticate, async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.user!.userId },
    });

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    await prisma.patient.update({
      where: { id: patient.id },
      data: { googleFitToken: null },
    });

    res.json({ success: true, message: 'Google Fit disconnected' });
  } catch (error) {
    console.error('Disconnect Google Fit error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect' });
  }
});

// Helper function to fetch and store Google Fit data
async function fetchAndStoreGoogleFitData(patientId: string, tokens: any) {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });

    const endTime = Date.now();
    const startTime = endTime - (7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Fetch steps data
    // @ts-ignore - Google Fitness API types mismatch
    const stepsResponse = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
        }],
        bucketByTime: { durationMillis: '86400000' }, // 1 day
        startTimeMillis: startTime.toString(),
        endTimeMillis: endTime.toString(),
      },
    });

    // Fetch heart rate data
    // @ts-ignore - Google Fitness API types mismatch
    const heartRateResponse = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.heart_rate.bpm',
        }],
        bucketByTime: { durationMillis: '86400000' },
        startTimeMillis: startTime.toString(),
        endTimeMillis: endTime.toString(),
      },
    });

    // Process and store data
    const buckets = stepsResponse?.data?.bucket || [];
    
    for (const bucket of buckets) {
      const date = new Date(parseInt(bucket.startTimeMillis || '0'));
      date.setHours(0, 0, 0, 0);

      const stepsDataset = bucket.dataset?.[0];
      const steps = stepsDataset?.point?.[0]?.value?.[0]?.intVal || 0;

      // Find corresponding heart rate
      const hrBucket = (heartRateResponse?.data?.bucket || []).find(
        (b: any) => b.startTimeMillis === bucket.startTimeMillis
      );
      const heartRate = hrBucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || null;

      // Upsert data
      await prisma.googleFitData.upsert({
        where: {
          patientId_date: {
            patientId,
            date,
          },
        },
        update: {
          steps,
          heartRate: heartRate ? Math.round(heartRate) : null,
          syncedAt: new Date(),
        },
        create: {
          patientId,
          date,
          steps,
          heartRate: heartRate ? Math.round(heartRate) : null,
          calories: Math.round(steps * 0.04), // Rough estimate
          syncedAt: new Date(),
        },
      });
    }

    console.log(`✅ Synced Google Fit data for patient ${patientId}`);
  } catch (error) {
    console.error('Error fetching Google Fit data:', error);
    throw error;
  }
}

export default router;
