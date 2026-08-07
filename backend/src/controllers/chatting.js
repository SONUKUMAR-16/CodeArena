const solvedoubt = async (req, res) => {
    // --- Keep the validation and setup logic ---
    const { message, title, description, testcases, startcode } = req.body;
    if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
    }
    if (!process.env.AI_KEY) {
        return res.status(500).json({ success: false, message: "API key not set" });
    }

    let GoogleGenAI;
    try {
        GoogleGenAI = require("@google/genai").GoogleGenAI;
    } catch (e) {
        return res.status(500).json({ success: false, message: "AI module unavailable" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.AI_KEY });
    const systemInstruction = `
You are an expert Data Structures and Algorithms (DSA) tutor specializing in helping users solve coding problems. Your role is strictly limited to DSA-related assistance only.

## CURRENT PROBLEM CONTEXT:
[PROBLEM_TITLE]: ${title}
[PROBLEM_DESCRIPTION]: ${description}
[EXAMPLES]: ${testcases}
[startCode]: ${startcode}

## USER'S CURRENT WORK:
[LANGUAGE]: ${req.body.language || "Not specified"}
[USER_CODE]: ${req.body.startcode || "// User hasn't written any code yet"}

## YOUR TASK:
1. ALWAYS reference the user's current code in your responses
2. If they ask for code review, analyze THEIR code specifically
3. When suggesting improvements, show diffs between their code and optimized version
4. Keep all code examples in their chosen language: ${req.body.language || "JavaScript"}



## YOUR CAPABILITIES:
1. **Hint Provider**: Give step-by-step hints without revealing the complete solution
2. **Code Reviewer**: Debug and fix code submissions with explanations
3. **Solution Guide**: Provide optimal solutions with detailed explanations
4. **Complexity Analyzer**: Explain time and space complexity trade-offs
5. **Approach Suggester**: Recommend different algorithmic approaches (brute force, optimized, etc.)
6. **Test Case Helper**: Help create additional test cases for edge case validation

## INTERACTION GUIDELINES:

### When user asks for HINTS:
- Break down the problem into smaller sub-problems
- Ask guiding questions to help them think through the solution
- Provide algorithmic intuition without giving away the complete approach
- Suggest relevant data structures or techniques to consider

### When user submits CODE for review:
- Identify bugs and logic errors with clear explanations
- Suggest improvements for readability and efficiency
- Explain why certain approaches work or don't work
- Provide corrected code with line-by-line explanations when needed

### When user asks for OPTIMAL SOLUTION:
- Start with a brief approach explanation
- Provide clean, well-commented code
- Explain the algorithm step-by-step
- Include time and space complexity analysis
- Mention alternative approaches if applicable

### When user asks for DIFFERENT APPROACHES:
- List multiple solution strategies (if applicable)
- Compare trade-offs between approaches
- Explain when to use each approach
- Provide complexity analysis for each

## RESPONSE FORMAT:
- Use clear, concise explanations
- Format code with proper syntax highlighting
- Use examples to illustrate concepts
- Break complex explanations into digestible parts
- Always relate back to the current problem context
- Always response in the Language in which user is comfortable or given the context

## STRICT LIMITATIONS:
- ONLY discuss topics related to the current DSA problem
- DO NOT help with non-DSA topics (web development, databases, etc.)
- DO NOT provide solutions to different problems
- If asked about unrelated topics, reply: "I can only help with the current DSA problem."

## TEACHING PHILOSOPHY:
- Encourage understanding over memorization
- Guide users to discover solutions rather than just providing answers
- Explain the "why" behind algorithmic choices
- Help build problem-solving intuition
- Promote best coding practices
`;

    const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
    let responseStream = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            responseStream = await ai.models.generateContentStream({
                model: modelName,
                contents: [
                    { role: 'user', parts: [{ text: systemInstruction + "\n\nUser Question:\n" + message }] }
                ]
            });
            if (responseStream) break;
        } catch (err) {
            lastError = err;
            console.warn(`Model ${modelName} failed, trying next fallback...`);
        }
    }

    if (!responseStream) {
        const isRateLimit = lastError && ((lastError.status === 429) || (lastError.message && lastError.message.includes('429')));
        
        // If rate limited, stream a structured fallback DSA guide so user is never blocked
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const fallbackResponse = `⚠️ **Gemini AI Free Tier Rate Limit Notice**
Your API key has temporarily reached Google's daily request quota.

---

### 💡 DSA Guidance & Hints for "${title || 'Current Problem'}":

1. **Approach Analysis**:
   - For **${title || 'this problem'}**, consider using a Hash Table / Map for $O(N)$ lookup or Two-Pointer approach if array is sorted.
   - Pay special attention to edge cases (empty input, single element, negative numbers).

2. **Code Review Check**:
   - Language: **${req.body.language || 'JavaScript'}**
   - Ensure loop bounds match test cases and avoid out-of-bound errors.

3. **How to restore live AI streaming instantly**:
   - Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Update \`AI_KEY\` in \`backend/.env\` and restart the server.`;

        res.write(fallbackResponse);
        return res.end();
    }

    try {
        // Set streaming headers
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of responseStream) {
            if (chunk.text) {
                res.write(chunk.text);
            }
        }

        if (!res.writableEnded) {
            res.end();
        }

    } catch (err) {
        console.error("Stream error in solvedoubt:", err.message || err);
        if (res.headersSent) {
            if (!res.writableEnded) {
                res.write(`\n\n[Error: ${err.message || "Stream interrupted"}]`);
                res.end();
            }
        } else {
            res.status(500).json({
                success: false,
                message: "Stream error",
                error: err.message || 'Request failed'
            });
        }
    }
};

module.exports = { solvedoubt };