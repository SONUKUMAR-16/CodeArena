const { getlanguagebyid, submitbatch ,submittoken} = require("../utils/problemutility");
const Problem = require("../models/problem");
const User = require("../models/user");
const Submission = require('../models/submission');
const mongoose = require('mongoose');

// controllers/userproblem.js - Update createproblem function
// controllers/userproblem.js - Update createproblem

const createproblem = async (req, res) => {
    const { title, description, difficulty, visibletestcases, hiddentestcases, startcode, referencesolution, problemcreator } = req.body;
    
    try {
        // Validate required fields
        if (!title || !description || !visibletestcases || !hiddentestcases || !startcode) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if there are any reference solutions
        if (!referencesolution || referencesolution.length === 0) {
            return res.status(400).json({ error: "At least one reference solution is required" });
        }

        // Filter out empty reference solutions
        const validReferenceSolutions = referencesolution.filter(
            solution => solution.completecode && solution.completecode.trim() !== ''
        );

        if (validReferenceSolutions.length === 0) {
            return res.status(400).json({ error: "At least one valid reference solution is required" });
        }

        // Test each valid reference solution against all test cases
        for (const { language, completecode } of validReferenceSolutions) {
            const languageId = getlanguagebyid(language);
            if (!languageId) {
                return res.status(400).json({ 
                    error: `Unsupported language: ${language}`,
                    suggestion: "Supported languages: javascript, java, c++"
                });
            }

            // Combine all test cases for validation
            const allTestCases = [...visibletestcases, ...hiddentestcases];
            const batch = allTestCases.map(test => ({
                stdin: test.input,
                expected_output: test.output,
                language_id: languageId,
                source_code: completecode,
                cpu_time_limit: 2,
                memory_limit: 128000
            }));

            // Submit batch to Judge0
            const submitResult = await submitbatch(batch);
            
            if (!submitResult || !Array.isArray(submitResult)) {
                return res.status(500).json({ error: "Invalid response from Judge0" });
            }

            const tokens = submitResult.map(value => value.token);
            const testResults = await submittoken(tokens);

            // Check each test case result
            const failedTests = [];
            for (let i = 0; i < testResults.length; i++) {
                const result = testResults[i];
                
                if (result.status_id !== 3) {
                    const testCaseInfo = allTestCases[i];
                    failedTests.push({
                        testCaseNumber: i + 1,
                        isHidden: i >= visibletestcases.length,
                        input: testCaseInfo.input,
                        expectedOutput: testCaseInfo.output,
                        actualOutput: result.stdout || result.stderr || result.compile_output || "No output",
                        status: result.status ? result.status.description : `Status ID: ${result.status_id}`,
                        time: result.time,
                        memory: result.memory,
                        message: result.message || "Test failed"
                    });
                }
            }

            if (failedTests.length > 0) {
                return res.status(400).json({
                    error: `Reference solution for ${language} failed test cases`,
                    language: language,
                    totalTestCases: allTestCases.length,
                    passed: allTestCases.length - failedTests.length,
                    failed: failedTests.length,
                    failedTests: failedTests,
                    suggestion: `Check your ${language} reference solution logic`
                });
            }
        }

        // All tests passed, create the problem (without tags)
        const problem = await Problem.create({
            title,
            description,
            difficulty,
            // tags removed
            visibletestcases,
            hiddentestcases,
            startcode,
            referencesolution: validReferenceSolutions,
            problemcreator: req.user._id
        });

        res.status(201).json({
            message: 'Problem created successfully',
            problemId: problem._id,
            title: problem.title,
            difficulty: problem.difficulty,
            // tags removed from response
            referenceLanguages: validReferenceSolutions.map(sol => sol.language)
        });

    } catch (err) {
        console.error('Create problem error:', err);
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
            suggestion: "Please check your input data and try again"
        });
    }
}

// FIXED VERSION - Get full problem by ID
const getfullproblembyid = async (req, res) => {
    const { id } = req.params;
    try {  
        console.log('getfullproblembyid called with ID:', id);
        
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                error: "Invalid or missing id parameter",
                success: false 
            });
        }
        
        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).json({ 
                error: "Problem not found",
                success: false 
            });
        }
        
        // Convert Mongoose document to plain JavaScript object
        // This ensures arrays are regular arrays, not Mongoose arrays
        const problemData = problem.toObject ? problem.toObject() : problem;
        
        // Ensure all arrays are present and properly formatted
        const safeProblemData = {
            ...problemData,
            _id: problemData._id,
            title: problemData.title || '',
            description: problemData.description || '',
            difficulty: problemData.difficulty || 'medium',
            tags: problemData.tags || 'array',
            // Ensure arrays exist and are properly formatted
            visibletestcases: Array.isArray(problemData.visibletestcases) 
                ? problemData.visibletestcases.map(tc => ({
                    input: tc.input || '',
                    output: tc.output || '',
                    explanation: tc.explanation || ''
                }))
                : [{ input: '', output: '', explanation: '' }],
            
            hiddentestcases: Array.isArray(problemData.hiddentestcases)
                ? problemData.hiddentestcases.map(tc => ({
                    input: tc.input || '',
                    output: tc.output || ''
                }))
                : [{ input: '', output: '' }],
            
            startcode: Array.isArray(problemData.startcode)
                ? problemData.startcode.map(sc => ({
                    language: sc.language || '',
                    initialcode: sc.initialcode || ''
                }))
                : [
                    { language: 'javascript', initialcode: '' },
                    { language: 'java', initialcode: '' },
                    { language: 'c++', initialcode: '' }
                ],
            
            referencesolution: Array.isArray(problemData.referencesolution)
                ? problemData.referencesolution.map(rs => ({
                    language: rs.language || '',
                    completecode: rs.completecode || ''
                }))
                : []
        };
        
        console.log('Returning safe problem data with referencesolution:', {
            hasRef: Array.isArray(safeProblemData.referencesolution),
            length: safeProblemData.referencesolution.length,
            sample: safeProblemData.referencesolution.slice(0, 2)
        });
        
        res.status(200).json(safeProblemData);
    }
    catch(err) {
        console.error('Error fetching full problem:', {
            message: err.message,
            stack: err.stack,
            id: id
        });
        res.status(500).json({ 
            error: "Internal server error",
            message: err.message,
            success: false
        });
    }
}

// FIXED VERSION - Update problem
// controllers/userproblem.js - Update updateproblem

const updateproblem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Missing problem id" });
        }

        const {
            title,
            description,
            difficulty,
            visibletestcases,
            hiddentestcases,
            startcode,
            referencesolution
        } = req.body;

        // Check problem exists
        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        // Validate arrays
        if (!Array.isArray(referencesolution) || referencesolution.length === 0) {
            return res.status(400).json({ message: "Reference solution missing or invalid" });
        }

        if (!Array.isArray(visibletestcases) || visibletestcases.length === 0) {
            return res.status(400).json({ message: "Visible test cases missing or invalid" });
        }

        // Validate reference solutions
        for (const ref of referencesolution) {
            const { language, completecode } = ref;

            if (!language || !completecode) {
                return res.status(400).json({ message: "Invalid reference solution format" });
            }

            const languageId = getlanguagebyid(language);

            const batch = visibletestcases.map(test => ({
                stdin: test.input,
                expected_output: test.output,
                language_id: languageId,
                source_code: completecode
            }));

            const submitresult = await submitbatch(batch);
            const tokens = submitresult.map(v => v.token);

            const testresult = await submittoken(tokens);

            for (const t of testresult) {
                if (t.status_id !== 3) {
                    return res.status(400).json({
                        message: "Reference solution failed on visible testcases"
                    });
                }
            }
        }

        // Update problem (without tags)
        await Problem.findByIdAndUpdate(
            id,
            { 
                title, 
                description, 
                difficulty, 
                visibletestcases, 
                hiddentestcases, 
                startcode, 
                referencesolution 
            },
            { runValidators: true, new: true }
        );

        return res.status(200).json({ message: "Problem updated successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};
const deleteproblem = async(req, res) => {
    const {id} = req.params;
    try {  
        if (!id) {
            return res.status(400).send("Missing id parameter");    
        }
        
        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).send("Problem not found");
        }

        await Problem.findByIdAndDelete(id);
        res.status(200).send('Problem deleted successfully');
    }
    catch(err) {
        console.error('Delete problem error:', err);
        res.status(400).send("Error: " + err.message);
    }
}

const getproblembyid = async(req, res) => {
    const {id} = req.params;
    try {  
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid or missing id parameter");    
        }
        
        const problem = await Problem.findById(id).select('_id title description difficulty tags visibletestcases startcode');
        if (!problem) {
            return res.status(404).send("Problem not found");
        }
        
        res.status(200).send(problem);
    }
    catch(err) {
        console.error('Get problem by ID error:', err);
        res.status(400).send("Error: " + err.message);
    }
}

const getallproblem = async(req, res) => {
    try {
        let problems = await Problem.find({}).select('_id title difficulty tags');
        if (!problems || problems.length === 0) {
            const seedProblems = require('../utils/seedProblems');
            await seedProblems();
            problems = await Problem.find({}).select('_id title difficulty tags');
        }
        
        res.status(200).json(problems || []);
    }
    catch(err) {
        console.error('Get all problems error:', err);
        res.status(400).json({ error: err.message });
    }
}

const solvedallproblembyuser = async(req, res) => {
    try {  
        const id = req.user._id;
        const user = await User.findById(id).populate({
            path: 'problemsolved',
            select: "_id title difficulty tags"
        });
        
        if (!user) {
            return res.status(404).send("User not found");
        }
        
        res.status(200).send(user.problemsolved || []);
    }
    catch(err) {
        console.error('Solved all problems by user error:', err);
        res.status(400).send("Error: " + err.message);
    }
}
const submittedproblem = async(req, res) => {
    try {  
        const uid = req.user._id;
        const pid = req.params.pid;
        
        if (!pid) {
            return res.status(400).json({
                success: false,
                error: "Missing problem ID"
            });
        }
        
        const result = await Submission.find({ userid: uid, problemid: pid })
            .sort({ createdAt: -1 })
            .lean();
        
        if (!result || result.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "No submissions found",
                submissions: [] 
            });
        }
        
        // Get problem details for context
        const problem = await Problem.findById(pid).select('title difficulty').lean();
        
        const formattedSubmissions = result.map(sub => ({
            _id: sub._id,
            problemId: sub.problemid,
            problemTitle: problem?.title || 'Unknown Problem',
            difficulty: problem?.difficulty || 'Unknown',
            language: sub.language,
            status: sub.status,
            runtime: sub.runtime,
            memory: sub.memory,
            testcasesPassed: sub.testcasespassed,
            testcasesTotal: sub.testcasestotal || 0,
            errorMessage: sub.errormessage,
            submittedAt: sub.createdAt,
            code: sub.code,
            codeLength: sub.code ? sub.code.length : 0
        }));
        
        res.status(200).json({
            success: true,
            problemTitle: problem?.title,
            problemDifficulty: problem?.difficulty,
            submissions: formattedSubmissions,
            total: formattedSubmissions.length
        });
    }
    catch(err) {
        console.error('Submitted problem error:', err);
        res.status(500).json({ 
            success: false,
            error: "Internal server error",
            message: err.message
        });
    }
}
const getUserSubmissions= async (req, res) => {
    try {
        const userId = req.user._id;
        
        console.log('Fetching submissions for user:', userId);
        
        // Get all submissions for the user with ALL fields
        const submissions = await Submission.find({ userid: userId })
            .select('-__v')  // Exclude version key, include everything else
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        
        console.log('Found submissions:', submissions.length);
        
        if (!submissions || submissions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No submissions found",
                submissions: []
            });
        }
        
        // Get unique problem IDs
        const problemIds = [...new Set(submissions.map(sub => sub.problemid))];
        
        // Get problem details for all problems
        const problems = await Problem.find({ 
            _id: { $in: problemIds } 
        }).select('title difficulty tags').lean();
        
        // Create a map for quick lookup
        const problemMap = {};
        problems.forEach(prob => {
            problemMap[prob._id.toString()] = prob;
        });
        
        // Format the submissions with problem details
        const formattedSubmissions = submissions.map(sub => {
            const problem = problemMap[sub.problemid?.toString()];
            return {
                _id: sub._id,
                problemId: sub.problemid,
                problemTitle: problem?.title || 'Unknown Problem',
                difficulty: problem?.difficulty || 'Unknown',
                tags: problem?.tags || 'Unknown',
                language: sub.language,
                status: sub.status,
                runtime: sub.runtime,
                memory: sub.memory,
                testcasesPassed: sub.testcasespassed,
                testcasesTotal: sub.testcasestotal || 0,
                errorMessage: sub.errormessage || '',
                submittedAt: sub.createdAt,
                code: sub.code || '',
                codeLength: sub.code ? sub.code.length : 0
            };
        });
        
        res.status(200).json({
            success: true,
            submissions: formattedSubmissions,
            total: formattedSubmissions.length
        });
    } catch (err) {
        console.error('Get all user submissions error:', err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message
        });
    }
}
module.exports = {
    createproblem,
    updateproblem,
    deleteproblem,
    getproblembyid,
    getallproblem,
    solvedallproblembyuser,
    submittedproblem,
    getfullproblembyid,
    getUserSubmissions
}