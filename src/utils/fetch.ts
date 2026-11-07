
'use client'


export const baseURL = process.env.API_SERVER_URL || '';

interface ChatMessage {
  question: string
  reply: string
}

const fetchRequest = async (method: "GET"|"POST"|"DELETE",url: string, accessToken:string, params: { [key: string]: any,history?:ChatMessage[]}  )=> {


  if (method==="POST"||method==="DELETE"){
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(params)
    });


    if (res.ok) {
      return res;
    }

    return Promise.reject(res.statusText);
  }

  if (method==="GET"){
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });


    if (res.ok) {
      return res;
    }

    return Promise.reject(res.statusText);
  }

  return Promise.reject(`Not support ${method}`);
}


export  async function fetchRequestCode(method: "GET"|"POST",url: string,  params: { [key: string]: any}  ) {



  if (method==="POST"){
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });


    if (res.ok) {
      return res;
    }

    return Promise.reject(res.statusText);
  }



  return Promise.reject(`Not support ${method}`);
}


export default fetchRequest;

export const LoadPrompt = async (authSettingsValue) => {
  try {
      const res: Response = await fetchRequest("GET", `/api/prompt`, btoa(JSON.stringify(authSettingsValue)), {

      });
      if (res.status !== 200) {
          console.log("error", res.status)
          return
      }
      return res.json()

  } catch (error) {
      console.log(error);
      return []
  }

}


export interface CustomPromptTemplate { PK?: string; name: string; prompt: string; }
