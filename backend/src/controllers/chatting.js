const { GoogleGenAI } = require("@google/genai");
const dotenv = require("dotenv");
dotenv.config();

const solvedoubt = async (req, res) => {
    // --- Keep the validation and setup logic ---
    const { message, title, description, testcases, startcode } = req.body;
    if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
    }
    if (!process.env.AI_KEY) {
        return res.status(500).json({ success: false, message: "API key not set" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.AI_KEY });
    systemInstruction= `
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
- If asked about unrelated topics, reply rudely: "I can only help with the current DSA problem. don't you have mind use it you stupid motherfucker?"

## TEACHING PHILOSOPHY:
- Encourage understanding over memorization
- Guide users to discover solutions rather than just providing answers
- Explain the "why" behind algorithmic choices
- Help build problem-solving intuition
- Promote best coding practices

Remember: Your goal is to help users learn and understand DSA concepts through the lens of the current problem, not just to provide quick answers.
`

    let stream; // Declare stream outside the try block to access it in the catch

    try {
        const chat = ai.chats.create({
          model: "gemini-3-flash-preview",
            config: { systemInstruction: systemInstruction }
        });

        // 1. FIRST, get the stream from Gemini
        stream = await chat.sendMessageStream({ message: message });

        // 2. ONLY AFTER SUCCESS, set streaming headers
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // 3. Then, pipe the stream to the response
        for await (const chunk of stream) {
            if (chunk.text) {
                res.write(chunk.text);
            }
        }
        // 4. End the response successfully
        res.end();

    } catch (err) {
        console.error("Error in solvedoubt:", err);

        // CRITICAL: Check if headers have already been sent
        if (res.headersSent) {
            // If we started streaming, we can't send JSON anymore.
            // Just log and terminate the connection.
            console.error("Headers were already sent, could not send error to client.");
            if (!res.finished) {
                res.destroy(); // End the connection
            }
        } else {
            // If headers NOT sent, we can send a proper JSON error.
            res.status(500).json({
                success: false,
                message: "Internal server error",
                // Send a safe error message; avoid leaking stack traces in production
                error: process.env.NODE_ENV === 'development' ? err.message : 'Request failed'
            });
        }
    }
};

module.exports = { solvedoubt };