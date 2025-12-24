require("dotenv").config();
const express = require("express");
const session = require("express-session");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

/* =========================
   AUTH START
========================= */
app.get("/login", (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: "code",
        scope: "identify email"
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

/* =========================
   CALLBACK
========================= */
app.get("/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("No code provided");

    try {
        // Exchange code for token
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            })
        });

        const tokenData = await tokenRes.json();

        // Fetch user
        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const user = await userRes.json();

        // Save session
        req.session.user = user;

        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.send("OAuth error");
    }
});

/* =========================
   USER INFO API
========================= */
app.get("/me", (req, res) => {
    if (!req.session.user) return res.status(401).json(null);
    res.json(req.session.user);
});

/* =========================
   LOGOUT
========================= */
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

/* =========================
   FRONTEND
========================= */
app.use(express.static("public"));

app.listen(3000, () =>
    console.log("Server running → http://localhost:3000")
);
