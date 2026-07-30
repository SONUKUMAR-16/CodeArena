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


const submittoken=async(tokens)=>{
const options = {
  method: 'GET',
  url: 'https://judge0-ce.p.rapidapi.com/submissions/batch',
  params: {
    tokens: tokens.join(','),
    base64_encoded: 'true',
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
while(true){
const result=await fetchData();
const resultobtained=result.submissions.every((k)=>k.status_id>2);
if(resultobtained)
    return result.submissions;
await delay();
}
}
module.exports={getlanguagebyid,submitbatch,submittoken}












