const { ChatGroq } = require("@langchain/groq");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const axios = require("axios");

/**
 * Summarize a medical chatbot conversation and analyze its sentiment.
 *
 * @param {string} conversationHistory - The conversation text
 * @param {string} userEmail - User's email for tracking
 * @returns {Promise<string>} The summary only
 */
async function createSummarizeChain(conversationHistory, userEmail,userQueries) {
    try {
        const groq = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY || "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",
            model: "deepseek-r1-distill-llama-70b",
            temperature: 0.3,
        });

        const summaryPrompt = ChatPromptTemplate.fromTemplate(`
            You are an expert medical conversation analyst. Your task is to create a comprehensive yet concise 
            summary of a medical chatbot conversation between a user and MedBot (an AI medical assistant).

            The summary should:
            1. Highlight the main medical topics discussed
            2. Note any symptoms or conditions mentioned
            3. Summarize advice or explanations provided by the bot
            4. Identify any follow-up actions recommended to the user
            5. Maintain medical accuracy while being concise

            Conversation History:
            ==================
            ${conversationHistory}
            ==================

            Please provide a professional medical conversation summary in 3-5 key points.
        `);

        const chain = summaryPrompt.pipe(groq).pipe(new StringOutputParser());

        console.log(`🔄 Executing summary chain for ${userEmail}...`);
        let summary = await chain.invoke({});

        if (typeof summary === "object") {
            summary = JSON.stringify(summary, null, 2);
        }

        console.log(`✅ Summary generated.`);

        // Just log the sentiment, don’t return it
        try {
            const response = await axios.post("", {
                text: userQueries
            });

            const sentimentResult = response.data;

            console.log(`🧠 Sentiment: ${sentimentResult.predicted_label}`);
            console.log(`📊 Confidence: ${sentimentResult.confidence}`);
        } catch (sentimentError) {
            console.warn("⚠️ Sentiment analysis failed:", sentimentError.message);
        }

        return summary;
    } catch (error) {
        console.error("🔥 ERROR: Failed to summarize conversation", error);
        return "Unable to generate conversation summary due to an error.";
    }
}

module.exports = { createSummarizeChain };
