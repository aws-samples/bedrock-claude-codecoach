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
  Input,
  IconButton,
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



import CleanMessages, {CleanMessagesByIndex} from "./CleanMessages"
import ExportMessages from "./ExportMessages"
import ExecuteCodeButton from "./ExecuteCode"

import fetchRequest from '../../utils/fetch';

import {runResult,authSettings,authState} from "../../state";


import {countTokens} from "../../utils/anthropictoken";


interface ChatMessage {
  question: string
  reply: string
  costToken?: number
}




const baseURL = process.env.NETX_PUBLIC_API_SERVER_URL || '';


export default function Chat() {
  //const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messages, setMessages] = useRecoilState(chatMessagesState);
  const authSettingsValue =useRecoilValue (authSettings)
  const auth= useRecoilValue(authState)

  const [isClient, setIsClient] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertText,setAlertText] =useState("");
  const [alertStatus,setAlertStatus] =useState("success");

  const messagesEnd = useRef<HTMLDivElement>(null);
  const chatInput = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState('');


  const [aiThinking, setAiThinking] = useState(false);
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  const runResultValue=useRecoilValue(runResult);

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
    console.log(auth);
  }, [])

  useEffect(() => {
     if (runResultValue!=""){
      setInputValue(runResultValue)
      sendMessage(runResultValue)
     }

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
    const [copyOk, setCopyOk] = useState(false);
    const iconColor = copyOk ? '#0af20a' : '#ddd';
    const icon = copyOk ? 'fa-check-square' : 'fa-copy';
    const handleClick = (e: any) => {
      navigator.clipboard.writeText(children.props.children);
      console.log(children.props.children)

      setCopyOk(true);
      setShowAlert(true);
      setAlertText("The code has been copied to the clipboard!")
      setTimeout(() => {
        setCopyOk(false);
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
  language: string
 }

  function CodeExecuteBtn({ children, language}: CodeExecuteBtnProps) {
    const [copyOk, setCopyOk] = useState(false);

    const iconColor = copyOk ? '#0af20a' : '#ddd';
    const icon = copyOk ? 'fa-check-square' : 'fa-copy';
    const handleClick = (e: any) => {
      console.log(children,language)

      setCopyOk(true);

      setTimeout(() => {
        setCopyOk(false);
        setShowAlert(false);
      }, 3000);

    }
    return (
      <div className="code-copy-btn"
        style={{
          top: "5px",
          right: "60px",
          position: "absolute",
        }}>
        <ExecuteCodeButton language={language} code={children} />

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

      if(auth.role==="guest"&&authSettingsValue.authType==="IAMROLE"){
        console.log("Need setup auth")
        setAiThinking(false);
        handlerShowAlert("Need setup auth","error")
        return
      }

      res = await fetchRequest("POST",`${baseURL}/api/bedrock/completion`, btoa(JSON.stringify(authSettingsValue)), {
        query: value,
        history: history

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
          updateMessageList(chunkValue)
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
                <Box p='2' bg={isDark?"blue.400":"gray.100"} rounded={"8px"}>
                  {m.question}
                </Box>
                <Box p='2' >
                  You
                </Box>

              </Flex>
              <Box mt="20px"><CleanMessagesByIndex index={index} cleanMessageByIndxe={removeMessageByIndex} />
                <Icon as={BsRobot} boxSize="24px" color={isDark?"blue.300":"blue.600"}/> {aiThinking&&<Spinner size='sm'/>} {!aiThinking&&m.costToken&&<Button leftIcon={<BiDollarCircle />} variant='solid' size={"xs"}>Token Cost : {m.costToken}</Button>}
              </Box>
              <Box ml="30px"  >
                <ReactMarkdown
                  children={m.reply}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: Pre,
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      //console.log(`langusage ${match}`)
                      return match ? (
                        <>
                        {match[1]==="python"&&<CodeExecuteBtn language={match[1]} children={String(children).replace(/\n$/, '')} />}
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
        <Input
          ref={ chatInput }
          size="md"
          placeholder="Enter message"

          onChange={(e) => debounced(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (chatInput.current&&chatInput.current.value){
                sendMessage(chatInput.current.value);
                chatInput.current.value="";
              }


            }
          }}
          w="70vw"
          ml={"20px"}
        />
      </Flex>

    </Flex>
  )
}
