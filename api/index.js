import express from 'express';
import axios from 'axios';

const router = express.Router();

// IP info endpoint
router.get('/ip-info', async (req, res) => {
  try {
    // Get client IP from request
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                     req.ip;

    // Clean up IP (remove ::ffff: prefix if present)
    const cleanIP = clientIP?.replace(/^::ffff:/, '') || 'unknown';

    // For localhost/development, provide mock data
    if (cleanIP === '127.0.0.1' || cleanIP === 'localhost' || cleanIP === '::1') {
      return res.json({
        ip: cleanIP,
        country: 'Local',
        region: 'Development',
        city: 'Localhost',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC'
      });
    }

    // Try to get location info from external API (optional)
    try {
      // Using a free IP geolocation service
      const response = await axios.get(`http://ip-api.com/json/${cleanIP}`, {
        timeout: 5000,
        params: {
          fields: 'status,country,regionName,city,lat,lon,timezone,query'
        }
      });

      if (response.data.status === 'success') {
        return res.json({
          ip: response.data.query,
          country: response.data.country,
          region: response.data.regionName,
          city: response.data.city,
          latitude: response.data.lat,
          longitude: response.data.lon,
          timezone: response.data.timezone
        });
      } else {
        throw new Error('IP lookup failed');
      }
    } catch (ipError) {
      console.warn('IP geolocation failed:', ipError.message);
      
      // Return basic info without geolocation
      return res.json({
        ip: cleanIP,
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC'
      });
    }
  } catch (error) {
    console.error('Error in /api/ip-info:', error);
    res.status(500).json({ 
      error: 'Failed to get IP info',
      message: error.message 
    });
  }
});

export default router;
