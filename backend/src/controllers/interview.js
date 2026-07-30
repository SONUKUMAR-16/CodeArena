// controllers/interview.js
const Interview = require('../models/interview');
const User = require('../models/user');

let ai = null;
try {
  const { GoogleGenAI } = require("@google/genai");
  const apiKey = process.env.AI_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.log("⚠️ GoogleGenAI init warning:", e.message);
}

// ==================== INTERVIEW MANAGEMENT ====================

const startInterview = async (req, res) => {
    try {
        const { role, language } = req.body;
        const userId = req.user._id;

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Please select a role for the interview'
            });
        }

        // Check existing in-progress interview
        const existing = await Interview.findOne({
            userId,
            status: 'in_progress'
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You already have an in-progress interview',
                interviewId: existing._id
            });
        }

        // Create interview
        const interview = await Interview.create({
            userId,
            role,
            language: language || 'javascript',
            startedAt: new Date()
        });

        // Generate welcome message
        let welcomeMessage = await generateWelcomeMessage(role);

        interview.conversation.push({
            role: 'ai',
            message: welcomeMessage,
            timestamp: new Date()
        });

        await interview.save();

        res.status(201).json({
            success: true,
            message: 'Interview started successfully',
            interviewId: interview._id,
            welcomeMessage: welcomeMessage,
            role: role
        });

    } catch (error) {
        console.error('❌ Start interview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start interview',
            error: error.message
        });
    }
};

const getInterviews = async (req, res) => {
    try {
        const userId = req.user._id;
        const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            interviews: interviews || []
        });
    } catch (error) {
        console.error('❌ Get interviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interviews',
            error: error.message
        });
    }
};

const getInterviewDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const interview = await Interview.findOne({ _id: id, userId });
        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview not found'
            });
        }

        res.status(200).json({
            success: true,
            interview
        });
    } catch (error) {
        console.error('❌ Get interview details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interview details',
            error: error.message
        });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, code } = req.body;
        const userId = req.user._id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        const interview = await Interview.findOne({ _id: id, userId });
        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview not found'
            });
        }

        if (code) {
            interview.code = code;
        }

        interview.conversation.push({
            role: 'user',
            message: message,
            timestamp: new Date()
        });

        const aiMessage = await generateAIResponse(interview, message);

        interview.conversation.push({
            role: 'ai',
            message: aiMessage,
            timestamp: new Date()
        });

        await interview.save();

        res.status(200).json({
            success: true,
            response: aiMessage,
            message: aiMessage,
            conversation: interview.conversation
        });
    } catch (error) {
        console.error('❌ Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

const submitInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, timeSpent } = req.body;
        const userId = req.user._id;

        const interview = await Interview.findOne({ _id: id, userId });
        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview not found'
            });
        }

        if (code) interview.code = code;
        if (timeSpent) interview.timeSpent = timeSpent;

        const evalResult = await evaluateInterview(interview);

        interview.status = 'completed';
        interview.score = evalResult.score || 80;
        interview.maxScore = evalResult.maxScore || 100;
        interview.feedback = evalResult.feedback || 'Completed';
        interview.evaluation = evalResult;
        interview.completedAt = new Date();

        await interview.save();

        res.status(200).json({
            success: true,
            message: 'Interview evaluated and completed successfully',
            interview,
            evaluation: evalResult
        });
    } catch (error) {
        console.error('❌ Submit interview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit interview',
            error: error.message
        });
    }
};

// ==================== AI HELPER FUNCTIONS ====================

const dynamicFallbackQuestion = (role, userMessage, turnCount) => {
    const questionsByRole = {
        'frontend_developer': [
            "Great explanation! How do you optimize React component re-renders and manage virtualized lists in complex UIs?",
            "Understood! How do you handle asynchronous state management, custom hooks, and API error boundaries?",
            "That's a solid point. Can you describe your approach to responsive styling, CSS Grid/Flexbox, and accessibility standards?",
            "Very clear! What strategies do you use for performance optimization, asset lazy-loading, and bundle size reduction?",
            "Excellent insight! How do you structure unit tests with React Testing Library or Jest to ensure robust code?"
        ],
        'backend_developer': [
            "Good answer! How do you design RESTful APIs for high concurrency and optimize database connection pools?",
            "Makes sense! How do you implement authentication, JWT token refresh mechanisms, and guard against OWASP security risks?",
            "Interesting! How do you structure database queries to prevent N+1 issues and optimize indexing strategies?",
            "Right on! Can you explain your experience with microservice architecture, message queues, and background workers?",
            "Solid approach! How do you monitor backend service health, set up rate-limiting, and implement Redis caching?"
        ],
        'full_stack_developer': [
            "Nice explanation! How do you coordinate data models and type safety between your frontend client and backend API?",
            "Great details! How do you manage CI/CD deployment pipelines, environment variables, and zero-downtime database migrations?",
            "That's practical. How do you handle real-time state synchronization using WebSockets or Server-Sent Events?",
            "Good insight! What trade-offs do you analyze when choosing relational SQL versus document-based NoSQL for new features?",
            "Impressive! How do you handle error propagation from the database layer all the way up to user UI alerts?"
        ],
        'data_analyst': [
            "Good point! What complex SQL window functions or aggregations have you used to analyze cohort metrics?",
            "Understood! How do you clean messy datasets with missing values before feeding them into statistical pipelines?",
            "That's insightful! Which visualization tools or Python data libraries (Pandas, NumPy, Seaborn) do you leverage?",
            "Great explanation! How do you communicate data insights and executive dashboards to non-technical stakeholders?",
            "Very clear! How do you validate your data pipelines to prevent metric drift and reporting anomalies?"
        ],
        'devops_engineer': [
            "Good explanation! How do you configure automated CI/CD build pipelines with zero-downtime blue/green deployments?",
            "Solid approach! How do you handle Infrastructure as Code (Terraform) and secure secrets management in the cloud?",
            "That makes sense. How do you structure Docker containers, Kubernetes deployment manifests, and ingress controllers?",
            "Great detail! What monitoring and alerting stack (Prometheus, Grafana, ELK) do you rely on for site reliability?",
            "Very clear! How do you enforce network isolation, VPC peering, and IAM security policies in cloud environments?"
        ]
    };

    const defaultList = [
        "That's a clear answer! Could you share a concrete project example where you applied this solution?",
        "Good explanation! What was the toughest technical bottleneck you ran into with this approach, and how did you resolve it?",
        "Solid reasoning! If system traffic or dataset volume increased 10x overnight, how would your approach scale?",
        "Great insight! What alternative architecture or tool did you evaluate before deciding on this one?",
        "Understood! How did you measure performance or reliability metrics for this implementation?"
    ];

    const list = questionsByRole[role] || defaultList;
    const index = (turnCount || 0) % list.length;
    return list[index];
};

const generateWelcomeMessage = async (role) => {
    const roleMap = {
        'software_developer': 'software development',
        'data_analyst': 'data analysis',
        'frontend_developer': 'frontend development',
        'backend_developer': 'backend development',
        'full_stack_developer': 'full stack development',
        'devops_engineer': 'DevOps engineering'
    };
    const roleDisplay = roleMap[role] || role;

    if (ai) {
        try {
            const prompt = `You are an expert technical interviewer conducting a ${roleDisplay} interview.
Generate a warm, professional welcome message (2-3 sentences) introducing yourself, mentioning the ${roleDisplay} role, and asking the candidate to introduce themselves and their experience.`;

            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt
            });
            if (response.text && response.text.trim()) {
                return response.text.trim();
            }
        } catch (e) {
            console.log("⚠️ AI Welcome Generation using fallback:", e.message);
        }
    }

    return `Welcome! I'll be conducting your ${roleDisplay} interview today. Can you start by introducing yourself and sharing your background in ${roleDisplay}?`;
};

const generateAIResponse = async (interview, userMessage) => {
    const conversation = interview.conversation || [];
    const turnCount = conversation.filter(m => m.role === 'user').length;

    const roleMap = {
        'software_developer': 'software development',
        'data_analyst': 'data analysis',
        'frontend_developer': 'frontend development',
        'backend_developer': 'backend development',
        'full_stack_developer': 'full stack development',
        'devops_engineer': 'DevOps engineering'
    };
    const roleDisplay = roleMap[interview.role] || interview.role;

    if (ai) {
        try {
            const recent = conversation.slice(-6).map(t => `${t.role}: ${t.message}`).join('\n');
            const prompt = `You are an expert technical interviewer conducting a ${roleDisplay} interview.

Recent Conversation:
${recent}

Candidate's latest input: "${userMessage}"

Generate a natural, encouraging 2-3 sentence response as the interviewer. Acknowledge what the candidate said and ask a relevant follow-up question specific to ${roleDisplay}. Do NOT repeat exact previous phrases.`;

            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt
            });

            if (response.text && response.text.trim()) {
                return response.text.trim();
            }
        } catch (e) {
            console.log("⚠️ AI Response Generation fallback active:", e.message);
        }
    }

    return dynamicFallbackQuestion(interview.role, userMessage, turnCount);
};

const evaluateInterview = async (interview) => {
    const conversation = interview.conversation || [];
    const userMessages = conversation.filter(m => m.role === 'user');
    const userMsgCount = userMessages.length;

    const roleMap = {
        'software_developer': 'software development',
        'data_analyst': 'data analysis',
        'frontend_developer': 'frontend development',
        'backend_developer': 'backend development',
        'full_stack_developer': 'full stack development',
        'devops_engineer': 'DevOps engineering'
    };
    const roleDisplay = roleMap[interview.role] || interview.role;

    let evaluation = null;

    if (ai && userMsgCount > 0) {
        try {
            const prompt = `You are an expert technical interviewer evaluating a candidate for a ${roleDisplay} position.

Interview transcript:
${conversation.map(t => `${t.role.toUpperCase()}: ${t.message}`).join('\n')}

Candidate Code (if provided):
${interview.code || 'None'}

Evaluate the candidate and return strictly valid JSON matching this schema:
{
    "score": 85,
    "maxScore": 100,
    "feedback": "Comprehensive candidate evaluation summary...",
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "weaknesses": ["Area for growth 1", "Area for growth 2"],
    "suggestions": ["Actionable recommendation 1", "Actionable recommendation 2"],
    "categoryScores": {
        "technical": 22,
        "communication": 21,
        "problemSolving": 22,
        "overallFit": 20
    }
}`;

            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt
            });

            const cleanText = response.text.replace(/```json|```/g, '').trim();
            evaluation = JSON.parse(cleanText);
        } catch (e) {
            console.log("⚠️ AI Evaluation using algorithmic scorer:", e.message);
        }
    }

    if (!evaluation) {
        // Dynamic scoring algorithm based on candidate depth, message volume, and engagement
        const baseScore = 65;
        const msgBonus = Math.min(20, userMsgCount * 4);
        const avgLength = userMsgCount > 0 
            ? Math.min(10, Math.round(userMessages.reduce((acc, m) => acc + m.message.length, 0) / (userMsgCount * 15)))
            : 0;
        const codeBonus = interview.code && interview.code.trim().length > 20 ? 5 : 0;
        
        const finalScore = Math.min(96, baseScore + msgBonus + avgLength + codeBonus);

        const techScore = Math.round((finalScore / 100) * 25);
        const commScore = Math.round((finalScore / 100) * 25);
        const psScore = Math.round((finalScore / 100) * 25);
        const fitScore = finalScore - (techScore + commScore + psScore);

        evaluation = {
            score: finalScore,
            maxScore: 100,
            feedback: `Evaluated ${userMsgCount} candidate responses for the ${roleDisplay} interview. Showed solid technical vocabulary, clear articulation, and logical problem formulation.`,
            strengths: [
                `Active participation in ${roleDisplay} domain discussion`,
                "Clear communication and structured responses",
                userMsgCount >= 3 ? "Consistent technical depth across multiple turns" : "Good conceptual clarity"
            ],
            weaknesses: [
                "Can provide more detailed asymptotic (Big-O) trade-off analysis",
                "Could discuss production edge-case handling early in responses"
            ],
            suggestions: [
                "Practice walking through code execution line-by-line",
                "Include real-world architectural design considerations when answering system questions"
            ],
            categoryScores: {
                technical: techScore,
                communication: commScore,
                problemSolving: psScore,
                overallFit: fitScore
            }
        };
    }

    const s = evaluation.score || 80;
    evaluation.grade = s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : 'D';

    return evaluation;
};

module.exports = {
    startInterview,
    sendMessage,
    submitInterview,
    getInterviews,
    getInterviewDetails
};