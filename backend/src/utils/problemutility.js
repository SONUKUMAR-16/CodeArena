const axios = require('axios');

const getlanguagebyid=(lang)=>{
         const language = {
        "c++":54,
        "java":62,
        "javascript":63
    }
    return language[lang.toLowerCase()];
}

const delay = () => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(1);  // Resolve the promise with value 1 after 1 second
        }, 1000);
    });
};

const submitbatch=async(batch)=>{   
    // console.log(batch);
    const options = {
        method: 'POST',
        url: 'https://judge0-ce.p.rapidapi.com/submissions/batch',
        params: {
            base64_encoded: 'false'
        },
        headers: {
            'x-rapidapi-key': 'd5ba0f1460msh95b6d793cc9eddfp10c9fdjsne94f7ab73e13',
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
            'Content-Type': 'application/json'
        },
        data: {
            submissions:batch
        }
        };

        async function fetchData() {
            try {
                const response = await axios.request(options);
                return response.data;
            } catch (error) {
                console.error(error);
            }
        }
        fetchData1=await fetchData();
        // console.log(fetchData1);
        return fetchData1;

}


const decodeIfBase64 = (str) => {
    if (!str || typeof str !== 'string') return str;
    try {
        // Quick check if str is valid base64
        const decoded = Buffer.from(str, 'base64').toString('utf-8');
        if (Buffer.from(decoded, 'utf-8').toString('base64') === str) {
            return decoded;
        }
    } catch (e) {}
    return str;
};

const submittoken = async (tokens) => {
    const options = {
        method: 'GET',
        url: 'https://judge0-ce.p.rapidapi.com/submissions/batch',
        params: {
            tokens: tokens.join(','),
            base64_encoded: 'false',
            fields: '*'
        },
        headers: {
            'x-rapidapi-key': 'd5ba0f1460msh95b6d793cc9eddfp10c9fdjsne94f7ab73e13',
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
        }
    };

    async function fetchData() {
        try {
            const response = await axios.request(options);
            return response.data;
        } catch (error) {
            console.error(error);
        }
    }

    while (true) {
        const result = await fetchData();
        if (result && result.submissions) {
            const resultobtained = result.submissions.every((k) => k.status_id > 2);
            if (resultobtained) {
                return result.submissions.map(sub => ({
                    ...sub,
                    stdout: decodeIfBase64(sub.stdout),
                    stderr: decodeIfBase64(sub.stderr),
                    compile_output: decodeIfBase64(sub.compile_output)
                }));
            }
        }
        await delay();
    }
}
module.exports={getlanguagebyid,submitbatch,submittoken}












