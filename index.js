const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// --- CONFIGURATION ---
const GEMINI_KEY = "TA_CLE_GEMINI_ICI";
const MON_NUMERO = "22395064497";
const MONGO_URI = "TON_LIEN_MONGODB_ICI";

// Connexion MongoDB
mongoose.connect(MONGO_URI).then(() => console.log("Mémoire de Denji activée !"));

const MsgSchema = new mongoose.Schema({
    userId: String,
    role: String,
    text: String,
    date: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MsgSchema);

const STICKERS = {
    content: ["https://telegra.ph/file/0c44a7f0e08f0a0614051.png"],
    colere: ["https://telegra.ph/file/3b8d6d6e6a1f8e2a3b4c5.png"],
    debile: ["https://telegra.ph/file/1a2b3c4d5e6f7g8h9i0j.png"]
};

app.get('/api/denji', async (req, res) => {
    const { text, sender } = req.query;
    if (!text) return res.json({ status: false });

    try {
        // 1. Récupérer l'historique (les 6 derniers messages)
        const history = await Message.find({ userId: sender }).sort({ date: -1 }).limit(6);
        let chatHistory = history.reverse().map(m => `${m.role}: ${m.text}`).join("\n");

        // 2. Définir le rôle
        const isOwner = sender.includes(MON_NUMERO);
        const systemPrompt = `Tu es Denji de Chainsaw Man. ${isOwner ? "Tu parles à ton Maître." : "Tu parles à un inconnu."} 
        Sois familier, un peu idiot, parle de nourriture. 
        Réponds courtement. FINIS TOUJOURS PAR UN TAG : [content], [colere] ou [debile].`;

        // 3. Appel Gemini
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            contents: [{ parts: [{ text: `${systemPrompt}\n\nHistorique :\n${chatHistory}\nUser: ${text}` }] }]
        });

        const aiRes = response.data.candidates[0].content.parts[0].text;
        
        // 4. Extraction émotion et nettoyage
        let emotion = "debile";
        if (aiRes.includes("[content]")) emotion = "content";
        if (aiRes.includes("[colere]")) emotion = "colere";
        const finalMsg = aiRes.replace(/\[.*?\]/g, "").trim();

        // 5. Sauvegarder en mémoire
        await new Message({ userId: sender, role: "User", text }).save();
        await new Message({ userId: sender, role: "Denji", text: finalMsg }).save();

        res.json({
            status: true,
            content: { message: finalMsg, sticker: STICKERS[emotion][0] }
        });

    } catch (e) { res.json({ status: false, error: e.message }); }
});

app.listen(process.env.PORT || 3000);
