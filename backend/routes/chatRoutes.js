const express = require("express");
const router = express.Router();
const { createSummarizeChain } = require("../controllers/summarizeChain");
const { getMedicalResponse } = require("../controllers/ragChatbot"); // Import function

// Store conversations in memory (consider using Redis or DB for production)
const sessionConversations = new Map();
const userQueriesMap = new Map(); // New map to store user-only queries


// Middleware to track conversations
const trackConversation = (req, res, next) => {
    const { userEmail, query } = req.body;
    
    if (!userEmail || !query) {
        return next();
    }
    
    // Initialize user conversation array if it doesn't exist
    if (!sessionConversations.has(userEmail)) {
        sessionConversations.set(userEmail, []);
    }
    
    // Store original response function
    const originalSend = res.json;
    
    // Override response function to capture bot's response
    res.json = function(data) {
        if (data && data.answer) {
            // Add the conversation pair to the user's session
            const conversations = sessionConversations.get(userEmail);
            conversations.push({
                user: query,
                bot: data.answer
            });

            if (!userQueriesMap.has(userEmail)) {
                userQueriesMap.set(userEmail, []);
            }
            userQueriesMap.get(userEmail).push(query); 
            
            console.log(`💬 Tracked conversation for ${userEmail}: Q: "${query.substring(0, 50)}..." A: "${data.answer.substring(0, 50)}..."`);
        }
        
        // Call original function
        return originalSend.call(this, data);
    };
    
    next();
};

// ✅ Chatbot query route with conversation tracking
router.post("/", trackConversation, async (req, res) => {
    try {
        const { userEmail, query } = req.body; // Get user email & query

        if (!userEmail || !query) {
            return res.status(400).json({ error: "User email and query are required." });
        }

        console.log(`📩 New Chat Query from ${userEmail}: ${query}`);

        const response = await getMedicalResponse(userEmail, query); // Get AI response

        res.json({ answer: response });

    } catch (error) {
        console.error("🔥 ERROR: Chatbot processing failed!", error);
        res.status(500).json({ error: "Internal Server Error. Please try again later." });
    }
});

// ✅ End session route - Generate summary and redirect to login
router.post("/end_session", async (req, res) => {
    try {
        const { userEmail } = req.body;

        if (!userEmail) {
            return res.status(400).json({ error: "User email is required." });
        }

        // Get user's conversation history
        const conversations = sessionConversations.get(userEmail) || [];
        const queriesOnly = userQueriesMap.get(userEmail) || [];
        
        if (conversations.length === 0) {
            console.log(`⚠️ No conversation history found for ${userEmail}`);
            return res.json({ 
                message: "Session ended. No conversation to summarize.",
                redirectTo: "/login" 
            });
        }

        // Format conversations for summary
        const formattedConversation = conversations.map(conv => 
            `User: ${conv.user}\nBot: ${conv.bot}`
        ).join("\n\n");

        console.log(`🔄 Generating summary for ${userEmail}'s session...`);
        
        // Generate conversation summary using LLM
        const summary = await createSummarizeChain(formattedConversation, userEmail,queriesOnly);
        
        // Clear the user's conversation history
        sessionConversations.delete(userEmail);
        userQueriesMap.delete(userEmail);
        
        console.log(`📝 Session Summary for ${userEmail}:\n${summary}`);
        
        // Respond with summary and redirect instruction
        res.json({ 
            message: "Session ended successfully",
            summary: summary,
            redirectTo: "/login" 
        });

    } catch (error) {
        console.error("🔥 ERROR: End session processing failed!", error);
        res.status(500).json({ error: "Failed to end session. Please try again." });
    }
});

module.exports = router;





// const express = require("express");
// const router = express.Router();
// const { getMedicalResponse } = require("../controllers/ragChatbot"); // Import function
// const { SummarizerManager } = require("node-summarizer");

// // ✅ Chatbot query route
// router.post("/", async (req, res) => {
//     try {
//         const { userEmail, query } = req.body; // Get user email & query

//         if (!userEmail || !query) {
//             return res.status(400).json({ error: "User email and query are required." });
//         }

//         console.log(`📩 New Chat Query from ${userEmail}: ${query}`);

//         const response = await getMedicalResponse(userEmail, query); // Get AI response

//         // Summarize the query
//         const querySummarizer = new SummarizerManager(query, 1);
//         const querySummary = querySummarizer.getSummaryByFrequency().summary;

//         // Summarize the response
//         const responseSummarizer = new SummarizerManager(response, 1);
//         const responseSummary = responseSummarizer.getSummaryByFrequency().summary;

//         console.log(`📝 Summary for ${userEmail}:\n- Query: ${querySummary}\n- Response: ${responseSummary}`);

//         res.json({ answer: response });

//     } catch (error) {
//         console.error("🔥 ERROR: Chatbot processing failed!", error);
//         res.status(500).json({ error: "Internal Server Error. Please try again later." });
//     }
// });

// module.exports = router;
