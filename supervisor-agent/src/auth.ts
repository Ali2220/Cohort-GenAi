import dotenv from 'dotenv';
dotenv.config()

// Google APIs ko import karna — Calendar aur Gmail ke liye
import { google } from 'googleapis';

// Node.js ke built-in modules — temporary server chalane ke liye
import http from 'http';
import url from 'url';

// Browser automatically kholne ke liye (auth URL open karne mein kaam ayega)
import open from 'open';

// ============================================
// STEP 1: OAuth2 Client Initialize Karna
// ============================================
// Yeh "Security Guard" hai jo Google ke saath hamari app ki pehchan karwayega
// 3 cheezein chahiye: Client ID, Client Secret, Redirect URI

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,      // .env se aata hai — Google Cloud Console se mila
    process.env.GOOGLE_CLIENT_SECRET,  // .env se aata hai — secret key
    'http://localhost:3000/callback'   // Login ke baad Google yahan bhejega user ko
);

// ============================================
// STEP 2: Scopes Define Karna (Permissions)
// ============================================
// Google ko batana ke hamari app ko kis kis cheez ka access chahiye

const scopes = [
    'https://www.googleapis.com/auth/calendar',   // Calendar read + write + events create
    'https://www.googleapis.com/auth/gmail.send', // Sirf email bhejne ka access (read nahi)
];

// ============================================
// STEP 3: Auth URL Generate Karna
// ============================================
// Google ke login page ka link banate hain jismein hamari permissions bhi included hain

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Is se "Refresh Token" milta hai — bar bar login nahi karna padta
    scope: scopes,           // Upar define ki hui permissions
    prompt: 'consent',       // Har dafa consent screen dikhaye — refresh token guarantee ke liye
});

// User ko URL dikhao — isay browser mein open karna hoga
console.log('🔗 Open this URL in browser:\n', authUrl);

// ============================================
// STEP 4: Temporary Server Start Karna
// ============================================
// Google login ke baad user ko "callback" URL pe bhejega
// Is server ka kaam hai wo callback pakadna aur token nikalna

const server = http.createServer(async (req, res) => {

    // URL parse karo taake query parameters (jaise "code") nikal sakein
    const parsedUrl = url.parse(req.url!, true);

    // Sirf "/callback" path par kaam karo — baqi ignore
    if (parsedUrl.pathname === '/callback') {

        // Google ne ek temporary "code" diya hai — isay asal token mein convert karna hai
        const code = parsedUrl.query.code as string;

        // ============================================
        // STEP 5: Code → Tokens Exchange Karna
        // ============================================
        // Temporary code ko Google ko wapis bhej kar asal "tokens" lena

        const { tokens } = await oauth2Client.getToken(code);

        // ============================================
        // STEP 6: Refresh Token Save Karna
        // ============================================
        // Refresh Token = Sab se zaroori cheez!
        // Iski madad se baar baar login kiye bina API calls kar sakte hain

        console.log('\n✅ Refresh Token (save in .env):');
        console.log(tokens.refresh_token);

        // Browser mein success message dikhaya
        res.end('Success! Check terminal for refresh token.');

        // Kaam khatam — server band karo aur program exit karo
        server.close();
        process.exit(0);
    }
});

// Server localhost:3000 pe chalu karo — yeh wo port hai jo redirect URI mein diya tha
server.listen(3000, () => {
    console.log('🚀 Waiting for callback on http://localhost:3000/callback');
});