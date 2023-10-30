
'use client'


export const baseURL = process.env.NETX_PUBLIC_API_SERVER_URL || 'http://localhost:3000';

interface ChatMessage {
  question: string
  reply: string
}

export default async function fetchRequest(method: "GET"|"POST",url: string, accessToken:string, params: { [key: string]: any,history?:ChatMessage[]}  ) {
  
 

  console.log(atob(accessToken),accessToken)
  console.log(history)

  if (method==="POST"){
    const res = await fetch(url, {
      method: 'POST',
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
  
  return Promise.reject(`Not support ${method}`);
}


export  async function fetchRequestCode(method: "GET"|"POST",url: string,  params: { [key: string]: any}  ) {
  

  const access_token= "SK-123456789012"

  if (method==="POST"){
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
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