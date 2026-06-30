import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/callback'
);

const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.send',
];

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
});

console.log('🔗 Open this URL in browser:\n', authUrl);

// Start temporary server to capture callback
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url!, true);
    
    if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code as string;
        
        const { tokens } = await oauth2Client.getToken(code);
        
        console.log('\n✅ Refresh Token (save in .env):');
        console.log(tokens.refresh_token);
        
        res.end('Success! Check terminal for refresh token.');
        server.close();
        process.exit(0);
    }
});

server.listen(3000, () => {
    console.log('🚀 Waiting for callback on http://localhost:3000/callback');
});