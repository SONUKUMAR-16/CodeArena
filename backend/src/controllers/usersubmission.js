const problem1=require('../models/problem')
const submission=require('../models/submission');
const { getlanguagebyid, submitbatch, submittoken } = require('../utils/problemutility');

const submitcode = async (req, res) => {
    let stored; // Declare outside try block for error handling
    
    try {
        const user = req.user;
        const problemid = req.params.id;
        const { code, language } = req.body;
        
        console.log('Submitting code:', { problemid, language, codeLength: code?.length });
        
        if (!user || !problemid || !code || !language)
            return res.status(400).json({ 
                success: false,
                message: "Missing required fields" 
            });

        const problem = await problem1.findById(problemid);
        if (!problem) {
            return res.status(404).json({ 
                success: false,
                message: "Problem not found" 
            });
        }

        // Create submission record
        stored = await submission.create({
            problemid: problemid,
            userid: user._id,
            code,
            language,
            status: 'pending',
            testcasestotal: problem.hiddentestcases.length + problem.visibletestcases.length
        });

        const languageid = getlanguagebyid(language);
        if (!languageid) {
            stored.status = 'error';
            stored.errormessage = 'Unsupported language';
            await stored.save();
            return res.status(400).json({ 
                success: false,
                message: "Unsupported language" 
            });
        }

        // Combine ALL test cases (both visible and hidden)
        const allTestCases = [...problem.visibletestcases, ...problem.hiddentestcases];
        
        const submissionbatch = allTestCases.map((test) => ({
            stdin: test.input,
            expected_output: test.output,
            language_id: languageid,
            source_code: code
        }));

        const result = await submitbatch(submissionbatch);
        const tokens = result.map((value) => value.token);
        const outputs = await submittoken(tokens);

        let testcasespassed = 0;
        let totalRuntime = 0;
        let maxMemory = 0;
        let status = 'accepted';
        let errormessage = null;
        let firstFailedTestCase = null;

        // Process each test case result
        for (let i = 0; i < outputs.length; i++) {
            const output = outputs[i];
            
            if (output.status_id === 3) { // Accepted
                testcasespassed++;
                totalRuntime += parseFloat(output.time) || 0;
                maxMemory = Math.max(maxMemory, output.memory || 0);
            } else {
                status = 'wrong';
                
                // Get simple error message from status description
                const simpleError = getSimpleErrorMessage(output.status_id, output.status?.description);
                
                if (!errormessage) {
                    errormessage = `Test case ${i + 1} failed: ${simpleError}`;
                    firstFailedTestCase = i + 1;
                }
                
                // Store only simple error, not technical details
                if (!errormessage.includes(simpleError)) {
                    errormessage = simpleError;
                }
            }
        }

        // If all test cases passed but status is wrong, check if there's a better error
        if (status === 'wrong' && testcasespassed === outputs.length) {
            status = 'error';
            errormessage = 'Unknown error occurred';
        }

        // Update submission
        stored.status = status;
        stored.testcasespassed = testcasespassed;
        stored.runtime = totalRuntime;
        stored.memory = maxMemory;
        stored.errormessage = errormessage;
        await stored.save();

        // Update user's solved problems if accepted
        if (status === 'accepted') {
            if (!user.problemsolved.includes(problemid)) {
                user.problemsolved.push(problemid);
                await user.save();
            }
        }
        res.status(201).json({
            success: true,
            status: stored.status,
            testcasespassed: stored.testcasespassed,
            testcasestotal: stored.testcasestotal,
            runtime: stored.runtime,
            memory: stored.memory,
            message: stored.errormessage || 'All test cases passed!',
            submissionId: stored._id
        });

    } catch (err) {
        console.error('Submission error:', err);
        
        // Try to save error to submission if it exists
        if (stored) {
            stored.status = 'error';
            stored.errormessage = 'Internal server error';
            await stored.save();
        }
        
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// Helper function to get simple error messages
const getSimpleErrorMessage = (statusId, statusDescription) => {
    // Map Judge0 status IDs to simple error messages
    const errorMap = {
        1: 'In Queue', // In Queue
        2: 'Processing', // Processing
        3: 'Accepted', // Accepted
        4: 'Wrong Answer', // Wrong Answer
        5: 'Time Limit Exceeded', // Time Limit Exceeded
        6: 'Compilation Error', // Compilation Error
        7: 'Runtime Error', // Runtime Error (SIGSEGV, SIGFPE, etc.)
        8: 'Memory Limit Exceeded', // Memory Limit Exceeded
        9: 'Output Limit Exceeded', // Output Limit Exceeded
        10: 'Internal Error', // Internal Error
        11: 'Exec Format Error', // Exec Format Error
        12: 'Forbidden System Call', // Forbidden System Call
        13: 'Time Limit Exceeded', // Time Limit Exceeded (Wall Time)
        14: 'Memory Limit Exceeded', // Memory Limit Exceeded (Wall Time)
        15: 'Killed', // Killed
        16: 'Killed', // Killed (Timeout)
        17: 'Runtime Error', // Runtime Error (SIGXFSZ)
        18: 'Runtime Error', // Runtime Error (SIGILL)
        19: 'Runtime Error', // Runtime Error (SIGUSR1)
        20: 'Runtime Error', // Runtime Error (SIGUSR2)
        21: 'Runtime Error', // Runtime Error (SIGPIPE)
        22: 'Runtime Error', // Runtime Error (SIGALRM)
        23: 'Runtime Error', // Runtime Error (SIGTERM)
        24: 'Runtime Error', // Runtime Error (SIGSTKFLT)
        25: 'Runtime Error', // Runtime Error (SIGCHLD)
        26: 'Runtime Error', // Runtime Error (SIGCONT)
        27: 'Runtime Error', // Runtime Error (SIGSTOP)
        28: 'Runtime Error', // Runtime Error (SIGTSTP)
        29: 'Runtime Error', // Runtime Error (SIGTTIN)
        30: 'Runtime Error', // Runtime Error (SIGTTOU)
    };
    
    // Get simple message from map
    let simpleMessage = errorMap[statusId] || 'Unknown Error';
    
    // Special handling for output limit exceeded (which should show as TLE for infinite loops)
    if (statusId === 9 || (statusDescription && statusDescription.toLowerCase().includes('output limit'))) {
        simpleMessage = 'Time Limit Exceeded (Output too large)';
    }
    
    // Special handling for file size limit exceeded
    if (statusDescription && statusDescription.toLowerCase().includes('file size limit')) {
        simpleMessage = 'Time Limit Exceeded (Output too large)';
    }
    
    return simpleMessage;
};



const runcode = async (req, res) => {
    try {
        const user = req.user;
        const problemid = req.params.id;
        const { code, language } = req.body;
        
        if (!user || !problemid || !code || !language)
            return res.status(400).json({ 
                success: false,
                message: "Missing required fields" 
            });
            
        const problem = await problem1.findById(problemid);
        if (!problem) {
            return res.status(404).json({ 
                success: false,
                message: "Problem not found" 
            });
        }
        
        const languageid = getlanguagebyid(language);
        if (!languageid) {
            return res.status(400).json({ 
                success: false,
                message: "Unsupported language" 
            });
        }
        
        const submissionbatch = problem.visibletestcases.map((test) => ({
            stdin: test.input,
            expected_output: test.output,
            language_id: languageid,
            source_code: code
        }));
        
        const result = await submitbatch(submissionbatch);
        const tokens = result.map((value) => value.token);
        const outputs = await submittoken(tokens);
        
        // Process outputs to show simple errors
        const simplifiedOutputs = outputs.map((output, index) => {
            const simpleError = getSimpleErrorMessage(output.status_id, output.status?.description);
            
            return {
                status_id: output.status_id,
                status: output.status,
                status_description: simpleError, // Use simple description
                stdout: output.stdout,
                stderr: output.stderr,
                compile_output: output.compile_output,
                time: output.time,
                memory: output.memory,
                test_case: index + 1
            };
        });
        
        res.status(201).json({
            success: true,
            results: simplifiedOutputs
        });
    }   
    catch(err) {
        console.error('Run code error:', err);
        res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
}    


module.exports={runcode,submitcode};