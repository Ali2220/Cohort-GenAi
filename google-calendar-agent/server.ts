import dotenv from 'dotenv'
dotenv.config()
import { google } from 'googleapis'
import express from 'express'

const app = express()

// 1. Google OAuth2 Client Initialize Karna
// Yeh client Google ke sath "Secret Handshake" (communication) karne ke kaam aata hai
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,     // App ki unique Client ID
    process.env.GOOGLE_CLIENT_SECRET, // App ka khufia Client Secret Key
    process.env.GOOGLE_REDIRECT_URI   // Login hone ke baad user ko kahan wapis bhejna hai
);

// 2. Scopes Define Karna (Permissions List)
// Google ko batana ke hamari app ko user ke account mein kis cheez ka access chahiye
const scopes = [
    'https://www.googleapis.com/auth/calendar' // Sirf Calendar par full access (Read & Write)
];

// ROUTE 1: Auth Route (User ko Google Login Page par bhejna)
app.get('/auth', (req, res) => {

    // Google ke liye ek special Login URL generate karna
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Is se Google humein 'Refresh Token' deta hai taake hum background mein kaam kar sakein
        scope: scopes,          // Jo permissions upar mangi thin, wo yahan pass kar dein
        prompt: "consent"       // Har dafa screen dikhaye taake Refresh Token lazmi generate ho (skip na ho)
    });

    console.log("Generated Auth URL: ", url);

    // User ko browser mein us Google Login page par bhej (redirect) dena
    res.redirect(url)
})

// ROUTE 2: Callback Route (Login ke baad Google ka wapis aana)
app.get('/callback', async (req, res) => {

    // User jab 'Allow' karta hai, to Google URL ke andar ek temporary 'code' bhejta hai
    const code = req.query.code as string

    try {
        // Exchange Process: Us temporary 'code' ko Google ko wapis bhej kar asal "Chabiyan" (Tokens) lena
        const { tokens } = await oauth2Client.getToken(code)

        // Is tokens object mein aapko 'access_token' aur 'refresh_token' dono milenge
        console.log(tokens);

        // Note: Yahan terminal se 'refresh_token' copy karke apni .env file mein save karlein
        res.send("Success! Check your terminal for tokens. You can close this page now.")

    } catch (error) {
        console.error("Error exchanging code for tokens:", error);
        res.status(500).send("Authentication failed.")
    }
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})