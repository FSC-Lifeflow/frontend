import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.server' });
const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Fitbit API proxy endpoints
app.get('/api/fitbit/activities/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit activities API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fitbit/sleep/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/sleep/date/${date}.json`, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit sleep API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fitbit/heart/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${date}/1d.json`, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit heart rate API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token exchange endpoint
app.post('/api/fitbit/token', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;
    const clientId = process.env.FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// n8n webhook proxy endpoint
app.post('/api/webhook/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    const response = await fetch(`https://n8n.rsweeting.com/webhook-test/${webhookId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('n8n webhook proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Fitbit proxy server running on http://localhost:${PORT}`);
});
