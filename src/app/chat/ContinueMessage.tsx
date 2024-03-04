'use client'

import { useEffect, useState} from "react";
import {Icon, Spinner } from "@chakra-ui/react";

import { BiLogoAws} from "react-icons/bi";
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import remarkGfm from 'remark-gfm'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'


import {fetchRequestCode} from "../../utils/fetch";

interface ChatMessage {
    question: string
    reply: string
  }
  const baseURL = process.env.API_SERVER_URL || '';


function getBashMarkdown(text: string) {
  const regex = /```bash([\s\S]*?)```/;
  const match = text.match(regex);
  const result= match ? match[0] : ''; 
  return result.replace('```bash','').replace('```','')
}



const ContinueMessage = ({question,reply}:ChatMessage) => {
  
  const [isClient,setIsClient] = useState(false)
  const [isLoading, setIsLoading]=useState(false);
  const [message,setMessage] =useState("")

  const Pre = ({ children }: any) => (<pre className="blog-pre"
  style={{
    position: "relative"
  }}>
  
  {children}
</pre>
)

  const onExecute = (code:string,question:string) => {

    console.log(code)
    
    fetchRequestCode("POST", `${baseURL}/api/execute`, {
        language: "awscli",
        code: code,
        question:question
      })
        .then((res) => res.json())
        .then(({run}) => {
          console.log(run)
          setMessage(run.answer??"")
        }).finally(()=>{setIsLoading(false)})
  
  }
  

  useEffect(() => {
    setIsClient(true)
 },[])

  return (
    <>
    <Icon as={BiLogoAws} 
    
                boxSize="36px" 
                color={"orange.300"}
                onClick={(e)=>{
                const code=String(getBashMarkdown(reply)).replace(/\n$/, '');
                console.log(code)
                setMessage("")
                setIsLoading(true)
                onExecute(code,question)
              }}
              _hover={{ cursor: 'pointer' }} 
              />
   {/* <IconButton
              aria-label='goto top'
              right={4}
              icon={ <BiLogoAws/>}
              colorScheme="orange"
              onClick={(e)=>{
                const code=String(getBashMarkdown(reply)).replace(/\n$/, '');
                console.log(code)
                setMessage("")
                setIsLoading(true)
                onExecute(code,question)
              }}
              /> */}
    {isLoading&&<Spinner size='sm'/>}
    
    <ReactMarkdown
                  children={message.replaceAll('"',"")}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: Pre,
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <>
                       
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                        />
                        </>

                      ) : (
                        <code {...props} className={className}>
                          {children}
                        </code>
                      )
                    }
                  }}
                />
    </>
  );
};

export default ContinueMessage;
