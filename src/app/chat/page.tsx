"use client"

import { useEffect, useState, useRef } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil';

import {useDebouncedCallback } from 'use-debounce';
import { chatMessagesState } from "../../state"

import {
  useColorMode,
  Alert,
  AlertIcon,
  Button,
  Box,
  Flex,
  Icon,
  IconButton,
  Textarea,
  Stack,
  Spinner
} from '@chakra-ui/react'

import { FaRegCopy } from "react-icons/fa"
import { BsRobot,BsArrowUpSquare,BsArrowDownSquare } from "react-icons/bs";
import { BiDollarCircle } from "react-icons/bi"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'


import fetchRequest from '@utils/fetch';

import {countTokens} from "@utils/anthropictoken";


import {runResult,authSettings,authState} from "../../state";


import CleanMessages, {CleanMessagesByIndex} from "./CleanMessages"
import ExportMessages from "./ExportMessages"
import ImportMessages from './ImportMessages';
import ExecuteCodeButton from "./ExecuteCode"
import ContinueMessage from "./ContinueMessage";
import { rebotoColor } from '@components/RobotIconColor';



const baseURL = process.env.NETX_PUBLIC_API_SERVER_URL || '';

const supportedLanguages=process.env.SUPPORTED_LANGUAGES ||  ["python","php","lua","typescript","go","awscli","sqlite3","sql","rust"]

function supported(language) {
  return supportedLanguages.includes(language)
}

function languageChoice(language){
  if (language==="bash"){
    return "awscli"
  }
  if (language==="sql"){
    return "sqlite3"
  }

  return language
}


const Chat = () => {
  const [messages, setMessages] = useRecoilState(chatMessagesState);
  const authSettingsValue =useRecoilValue (authSettings)
  const auth= useRecoilValue(authState)
  const [isClient, setIsClient] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertText,setAlertText] =useState("");
  const [alertStatus,setAlertStatus] =useState("success");

  const messagesEnd = useRef<HTMLDivElement>(null);
  const chatInput = useRef<HTMLTextAreaElement>(null);

  const [, setInputValue] = useState('');


  const [aiThinking, setAiThinking] = useState(false);
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  const [runResultValue,setRunResult]=useRecoilState(runResult);




  const debounced = useDebouncedCallback(
    // function
    (value) => {
      setInputValue(value);
    },
    // delay in ms
    1000
  );


  const scrollToBottom = () => {

    if (messagesEnd && messagesEnd.current) {
      messagesEnd.current.scrollIntoView({ behavior: 'smooth' });
      messagesEnd.current.scrollTop = messagesEnd.current.scrollHeight;
    }
  };

  const scrollToTop = () => {

    if (messagesEnd && messagesEnd.current) {
      messagesEnd.current.scrollIntoView({ behavior: 'smooth' });
      messagesEnd.current.scrollTop = 0;
    }
  };

  const clearMessages=()=>{
    setMessages([])
  }

  const handlerShowAlert=(text:string,status?:string, timeout?:number)=>{
    setShowAlert(true)
    setAlertText(text)
    setAlertStatus(status??"success")
    setTimeout(() => {
      setShowAlert(false);
    }, timeout??3000);
  }


  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
     if (runResultValue!=""){
      setInputValue(runResultValue)
      sendMessage(runResultValue)
      
     }
     return ()=>{setRunResult("")}

  }, [runResultValue])

  const sendMessage = (message: string) => {

    const token=countTokens(message)
    setMessages([...messages, { question: message, reply: "",costToken:token }])
    onReply(message);
  }

  const updateMessageList = (message: string,) => {

    setMessages((pre) => {
      return [
        ...pre.slice(0, -1),
        {
          ...pre.slice(-1)[0],
          reply: pre.slice(-1)[0].reply + message,
        }
      ];
    });

  };

  const removeMessageByIndex=(index:number) =>{

    setMessages((pre) => {

      if (index < 0 || index >= pre.length) {
        // Invalid index, return the original array
        return pre;
      }

      const updatedMessages = [...pre.slice(0, index), ...pre.slice(index + 1)];
      return updatedMessages;
    });
  }

  function CodeCopyBtn({ children }: any) {
   
    
    const handleClick = () => {
      navigator.clipboard.writeText(children.props.children);
      setShowAlert(true);
      setAlertText("The code has been copied to the clipboard!")
      setTimeout(() => {
        setShowAlert(false);
      }, 3000);
    }
    return (
      <div className="code-copy-btn"
        style={{
          top: "5px",
          right: "5px",
          position: "absolute",
        }}>

        <IconButton aria-label='Copy this code' icon={<FaRegCopy/>} onClick={handleClick} />
      </div>
    )
  }

 interface CodeExecuteBtnProps {
  children:any,
  setChildren:any,
  language: string
 }

  function CodeExecuteBtn({ children, language,setChildren}: CodeExecuteBtnProps) {
    
    return (
      <div className="code-copy-btn"
        style={{
          top: "5px",
          right: "60px",
          position: "absolute",
        }}>
        <ExecuteCodeButton language={language} code={children} setCode={setChildren} />

      </div>
    )
  }

  const Pre = ({ children }: any) => (<pre className="blog-pre"
    style={{
      position: "relative"
    }}>
    <CodeCopyBtn>{children}</CodeCopyBtn>
    {children}
  </pre>
  )

  const onReply = async (value: string) => {
    try {

      const token=countTokens(value)
      console.log(`use token ${token}`)

      setAiThinking(true);

      let res: Response;
      let isMindmap: boolean = false;
      const history = messages.slice(-5)


      res = await fetchRequest("POST",`${baseURL}/api/bedrock/completion`, btoa(JSON.stringify(authSettingsValue)), {
        query: value,
        history: history,
        role: authSettingsValue.aiRole,
        roleType: authSettingsValue.roleType,

      }  );
      if (res.status!==200){
        setAiThinking(false);
        updateMessageList("Please check your auth settings")
        return
      }
      const reader = res?.body?.getReader() as ReadableStreamDefaultReader;

      const decoder = new TextDecoder();
      let done = false;
      let metaData: any;
      console.log(`isMindmap ${isMindmap}`)
      updateMessageList("")
      setAiThinking(false);
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        const hasMeta = chunkValue.includes('\n ###endjson### \n\n');
        if (hasMeta) {
          const [metaDataStr, message] = chunkValue.split('\n ###endjson### \n\n');
          metaData = JSON.parse(metaDataStr);
          updateMessageList(message.trim())
          console.log(metaData, message.trim());

        } else {
          console.log(chunkValue);
          if (authSettingsValue.aiRole==="AUTOGEN"){
            if (chunkValue.indexOf("user_proxy")===-1&&chunkValue.trim().endsWith("TERMINATE")===false){
              updateMessageList(chunkValue)
              updateMessageList("")
            }
          }else{
            updateMessageList(chunkValue)
          }
        }
        scrollToBottom()
      }
     
    } catch (error) {
      setAiThinking(false);
      console.log(error);

    }
  };



  return (
    <Flex direction="column" h="85vh" align="center" overflow={"hidden"}>
      {showAlert && <Box ml="10%" w="30%">
        <Stack spacing={3} >
          <Alert status={alertStatus as any}>
            <AlertIcon />
            {alertText}
          </Alert>
        </Stack>
      </Box>
      }
      <Flex w="80%" h="75%" >
        <Box flexGrow={2} p={4} overflowY="auto"
          ref={messagesEnd}
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#CBD5E0',
              borderRadius: '24px',
            },
          }}
        >
          {isClient && messages.map((m, index) =>
            <Box key={index} pt="50px">

              <Flex alignContent={"right"} justifyContent={"right"}>
                <Box p='2' bg={isDark?"blue.300":"gray.100"} rounded={"8px"}>
               
                <ReactMarkdown>{m.question}</ReactMarkdown>
                </Box>
                <Box p='2' >
                  You
                </Box>

              </Flex>
              <Box mt="20px"><CleanMessagesByIndex index={index} cleanMessageByIndxe={removeMessageByIndex} />
              
              <Icon as={BsRobot} boxSize="24px" color={rebotoColor(isDark,authSettingsValue.roleType,authSettingsValue.aiRole)} />{aiThinking&&<Spinner size='sm'/>} {!aiThinking&&m.costToken&&<Button leftIcon={<BiDollarCircle />} variant='solid' size={"xs"}>Token Cost : {m.costToken}</Button>}
              </Box>
              <Box ml="30px"  >
                <ReactMarkdown
                  children={m.reply}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: Pre,
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const [codeChildren, setCodeChildren]=useState(String(children).replace(/\n$/, ''))
                      return match ? (
                        <>
                        {(supported(match[1]))&&<CodeExecuteBtn language={languageChoice(match[1])} children={codeChildren} setChildren={setCodeChildren}/>}
                        <SyntaxHighlighter
                          {...props}
                          children={codeChildren}
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
              {authSettingsValue.aiRole==="AWSCLICOACH"&&!aiThinking&&<>
              <ContinueMessage question={m.question} reply={m.reply}/>
               
              </>}
              </Box>
            </Box>

          )}
        </Box>
     <Flex  ml="40px" direction="column" justify="center" align="center">
     <IconButton
            aria-label='goto top'
            right={4}
            icon={ <BsArrowUpSquare/>}
            colorScheme="green"
            onClick={(e)=>{scrollToTop()}}
            />
       <Box h="1rem" />
      <CleanMessages clearMessages={clearMessages} />
      <Box h="1rem" />
      <ExportMessages messages={messages} />
      <Box h="1rem" />
      <ImportMessages ></ImportMessages>
      <Box h="1rem" />
      <IconButton
            right={4}
            icon={ <BsArrowDownSquare/>}
            aria-label="Toggle Theme"
            colorScheme="green"
            onClick={(e)=>{
              scrollToBottom()
            }}
            />
    </Flex>
      </Flex>

      <Flex
        justifyContent={"center"}
        p={8}
      >
        <Textarea
                  ref={ chatInput }
                  placeholder={`Enter here ......`}
                  ml="-50px"
                  size="md"
                  resize="none"
                  rows={3}
                  w="70vw"
                  bg={isDark?"":"gray.200"}
                  variant="brandPrimary"
                  onChange={(e) => debounced(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (chatInput.current&&chatInput.current.value){
                        sendMessage(chatInput.current.value);
                        chatInput.current.value="";
                      }
                    }
                  }}
                />
      </Flex>
      
    </Flex>
  )
}


export default Chat;