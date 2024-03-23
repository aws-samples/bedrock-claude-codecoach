"use client"

import { useEffect, useState, useRef } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil';

import { useDebouncedCallback } from 'use-debounce';



import {
  useColorMode,
  Alert,
  AlertIcon,
  Button,
  Image as ChakraImage,
  Box,
  Flex,
  Icon,
  IconButton,
  Textarea,
  Stack,
  Spinner,
  Card,
  CardBody,
  Text,
  CardFooter
} from '@chakra-ui/react'

import { FaRegCopy } from "react-icons/fa"
import { MdAttachFile } from "react-icons/md"

import { BsRobot, BsArrowUpSquare, BsArrowDownSquare } from "react-icons/bs";

import { CiCircleRemove } from "react-icons/ci";
import { IoAddOutline } from "react-icons/io5";

// import { BiDollarCircle } from "react-icons/bi"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'


import fetchRequest from '@utils/fetch';

import { countTokens } from "@utils/anthropictoken";


import { runResult, awsProviderSettings, workspacesState} from "../../state";


import CleanMessages, { CleanMessagesByIndex } from "./CleanMessages"
import ExportMessages from "./ExportMessages"
import ImportMessages from './ImportMessages';
import ExecuteCodeButton from "./ExecuteCode"
import ContinueMessage from "./ContinueMessage";
import { rebotoColor } from '@components/RobotIconColor';
import ImportImage from './ImportImage';
import Documents from './Documents';





const baseURL = process.env.API_SERVER_URL || '';

const supportedLanguages = process.env.SUPPORTED_LANGUAGES || ["python", "php", "lua", "typescript", "go", "awscli", "sqlite3", "sql", "rust"]

function supported(language) {
  return supportedLanguages.includes(language)
}

function languageChoice(language) {
  if (language === "bash") {
    return "awscli"
  }
  if (language === "sql") {
    return "sqlite3"
  }

  return language
}


const Chat = () => {

  const [workspaces, setWorkspaces] = useRecoilState(workspacesState);
  const [currentWorkspaceIndex, setCurrentWorkspaceIndex] = useState(0);



  const handleAddWorkspace = () => {
    // 添加新的 workspace
    if (workspaces.length===5){
      handlerShowAlert("Not add more workspace","warning")
      return;
    }
    setWorkspaces([...workspaces, { name: `Workspace ${workspaces.length + 1}`,contentSummary:"", messages: [] }]);
  };

  const handleDeleteWorkspace = (index) => {
    if (workspaces.length === 1) {
      // 如果只剩下一个 workspace 了,就不允许删除
      //alert("不能删除最后一个 workspace");
      handlerShowAlert("Not remove workspace, need at least 1","warning")
      return;
    }

    // 删除指定的 workspace
    const newWorkspaces = [...workspaces];
    newWorkspaces.splice(index, 1);
    setWorkspaces(newWorkspaces);
    setCurrentWorkspaceIndex(Math.max(0, currentWorkspaceIndex - 1));
  };

  const handleSwitchWorkspace = (index) => {
    // 切换到指定的 workspace
    setCurrentWorkspaceIndex(index);
  };



  const awsProviderSettingsValue = useRecoilValue(awsProviderSettings)
  
  const [isClient, setIsClient] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [alertStatus, setAlertStatus] = useState("success");

  const messagesEnd = useRef<HTMLDivElement>(null);
  const chatInput = useRef<HTMLTextAreaElement>(null);

  const [, setInputValue] = useState('');


  const [aiThinking, setAiThinking] = useState(false);
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  const [image, setImage] = useState("");
  const [encodedImage, setEncodedImage] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [currentFile, setCurrentFile] = useState("");

  const [runResultValue, setRunResult] = useRecoilState(runResult);



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

  const clearMessages = () => {
    
    const newWorkspaces = workspaces.map((workspace, index) => {
      if (index === currentWorkspaceIndex) {
        return {
          ...workspace,
          messages: []
        };
      }
      return workspace;
    });
    setWorkspaces(newWorkspaces);
    
    
  }

  const handlerShowAlert = (text: string, status?: string, timeout?: number) => {
    setShowAlert(true)
    setAlertText(text)
    setAlertStatus(status ?? "success")
    setTimeout(() => {
      setShowAlert(false);
    }, timeout ?? 3000);
  }


  useEffect(() => {
    setIsClient(true)
    
  }, [])

  useEffect(() => {
    if (runResultValue != "") {
      setInputValue(runResultValue)
      sendMessage(runResultValue)

    }
    return () => { setRunResult("") }

  }, [runResultValue])

  const sendMessage = (message: string) => {

   const token = countTokens(message)

   const newWorkspaces = workspaces.map((workspace, index) => {
    if (index === currentWorkspaceIndex) {
      if (workspace.messages.length==0) {
        return {
          ...workspace,
          contentSummary:message.length>15?message.slice(0,13):message.padEnd(13-message.length, " ."),
          messages: [
            ...workspace.messages,
            { question: message, reply: "", costToken: token, file: currentFile ?? "", image: image ?? "" }
          ]
        };
      }
      return {
        ...workspace,
        messages: [
          ...workspace.messages,
          { question: message, reply: "", costToken: token, file: currentFile ?? "", image: image ?? "" }
        ]
      };
    }
    return workspace;
  });
  setWorkspaces(newWorkspaces);


 onReply(message);
    if (currentFile !== "") {
      setCurrentFile("")
    }

    if (mediaType !== "") {
      setMediaType("")
    }

    if (image !== "") {
      setImage("")
    }
  }

  const updateMessageList = (message: string,) => {
    setWorkspaces((prevWorkspaces) => {
      const updatedWorkspaces = [...prevWorkspaces];
      const currentWorkspace = updatedWorkspaces[currentWorkspaceIndex];
  
      // 更新当前工作区的消息列表
      const updatedMessages = [...currentWorkspace.messages];
      const lastMessage = updatedMessages[updatedMessages.length - 1];
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMessage,
        reply: lastMessage.reply + message,
      };
  
      // 更新当前工作区的消息列表
      updatedWorkspaces[currentWorkspaceIndex] = {
        ...currentWorkspace,
        messages: updatedMessages,
      };
  
      return updatedWorkspaces;
    });


  };

  

  const removeMessageByIndex = (index: number) => {

   


    const newWorkspaces = workspaces.map((workspace, workspaceIndex) => {
      if (workspaceIndex === currentWorkspaceIndex) {
        const updatedMessages = workspace.messages.filter((_, i) => i !== index);
        return {
          ...workspace,
          messages: updatedMessages,
        };
      }
      return workspace;
    });
    setWorkspaces(newWorkspaces);

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

        <IconButton aria-label='Copy this code' icon={<FaRegCopy />} onClick={handleClick} />
      </div>
    )
  }

  interface CodeExecuteBtnProps {
    children: any,
    setChildren: any,
    language: string
  }

  function CodeExecuteBtn({ children, language, setChildren }: CodeExecuteBtnProps) {

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

      const token = countTokens(value)
      console.log(`use token ${token}`)

      setAiThinking(true);

      let res: Response;
      let isMindmap: boolean = false;
      const history = workspaces[currentWorkspaceIndex].messages.slice(-5)

      if (image&&image!=""){
        res = await fetchRequest("POST", `${baseURL}/api/bedrock/completion`, btoa(JSON.stringify(awsProviderSettingsValue)), {
          query: value,
          history: history,
          role: awsProviderSettingsValue.aiRole,
          roleType: awsProviderSettingsValue.roleType,
          model: awsProviderSettingsValue.model,
          image: image,
          file: currentFile,
  
        });
      }else{
        res = await fetchRequest("POST", `${baseURL}/api/bedrock/completion`, btoa(JSON.stringify(awsProviderSettingsValue)), {
          query: value,
          history: history,
          role: awsProviderSettingsValue.aiRole,
          roleType: awsProviderSettingsValue.roleType,
          model: awsProviderSettingsValue.model,
          file: currentFile,
  
        });
      }
      
      if (res.status !== 200) {
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
          if (awsProviderSettingsValue.aiRole === "AUTOGEN") {
            if (chunkValue.indexOf("user_proxy") === -1 && chunkValue.trim().endsWith("TERMINATE") === false) {
              updateMessageList(chunkValue)
              updateMessageList("")
            }
          } else {
            updateMessageList(chunkValue)
          }
        }
        scrollToBottom()
      }

    } catch (error) {
      setAiThinking(false);
      console.log(error);

    } finally {
      if (image != "" || encodedImage != "" || mediaType != "") {
        setImage("")
        setEncodedImage("")
        setMediaType("")
      }
    }
  };

  const encodedImageObject = image && mediaType ? {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType,
      data: image,
    },
  } : null;

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
     
    
      <Flex w="100%" h="85%" >

        
      <Flex ml="40px" direction="column" justify="center" align="left">
     
      {isClient&&workspaces.map((workspace, index) => (
          <Card
            key={index}
            direction={{ base: 'column', sm: 'row' }}
            overflow='hidden'
            variant='outline'
            size='md'
            mr="10px"
            marginRight="10px"
            marginTop="10px" 
            w={"200px"}
            boxShadow={index === currentWorkspaceIndex ? '0 0 10px rgba(1o, 0, 0, 0.5)' : 'none'}
            backgroundColor={index === currentWorkspaceIndex ? 'green.300' : 'none'}
          >
            <CardBody onClick={() => handleSwitchWorkspace(index)} w={"100px"}>
             {isClient&&<Text style={{ fontSize: '12px' }}  >
              {workspace.contentSummary === ""? workspace.name: `${workspace.contentSummary}`}
              </Text>}
            </CardBody>
            <CardFooter justifyContent="flex-end">
    <IconButton
      aria-label="Delete Workspace"
      icon={<CiCircleRemove />}
      size="sm"
      onClick={() => {handleDeleteWorkspace(index)}}
    />
  </CardFooter>
          </Card>
   ))}
   <IconButton
      aria-label="Delete Workspace"
      icon={<IoAddOutline />}
      size="sm"
      marginRight="10px"
      marginTop="10px" 
      onClick={handleAddWorkspace}
    />

        </Flex>

        <Flex w="75%" h="95%" >


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
            {isClient && workspaces[currentWorkspaceIndex].messages.map((m, index) =>
              <Box key={index} pt="50px">

                <Flex alignContent={"right"} justifyContent={"right"}>
                  <Box p='2' bg={isDark ? "blue.300" : "gray.100"} rounded={"8px"}>

                    <ReactMarkdown>{m.question}</ReactMarkdown>
                    {m.file !== "" && <div><Icon as={MdAttachFile} /> {m.file}</div>}
                    {m.image && m.image != "" && m.image != "null" &&m.image != "undefined" && <div>
                     <ChakraImage width={"15%"} height={"10%"} src={`data:${mediaType};base64,${JSON.parse(m.image??"").source?.data}`} alt="selected" />
                    </div>}

                  </Box>
                  <Box p='2' >
                    You
                  </Box>

                </Flex>
                <Box mt="20px"><CleanMessagesByIndex index={index} cleanMessageByIndxe={removeMessageByIndex} />
                  {/* <Tooltip label="robot-1" aria-label="Robot Icon"> */}
                  <Icon as={BsRobot} boxSize="24px" color={rebotoColor(isDark, awsProviderSettingsValue.roleType, awsProviderSettingsValue.aiRole)} />{aiThinking && <Spinner size='sm' />}
                  {/* </Tooltip> */}
                  {/* {!aiThinking&&m.costToken&&<Button leftIcon={<BiDollarCircle />} variant='solid' size={"xs"}>Token Cost : {m.costToken}</Button>} */}
                </Box>
                <Box ml="30px"  >
                  <ReactMarkdown
                    children={m.reply}
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: Pre,
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const [codeChildren, setCodeChildren] = useState(String(children).replace(/\n$/, ''))
                        return match ? (
                          <>
                            {(supported(match[1])) && <CodeExecuteBtn language={languageChoice(match[1])} children={codeChildren} setChildren={setCodeChildren} />}
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
                  {awsProviderSettingsValue.aiRole === "AWSCLICOACH" && !aiThinking && <>
                    <ContinueMessage question={m.question} reply={m.reply} />

                  </>}
                </Box>
              </Box>

            )}
          </Box>
          <Flex ml="40px" direction="column" justify="center" align="center">
            <IconButton
              aria-label='goto top'
              right={4}
              icon={<BsArrowUpSquare />}
              colorScheme="green"
              onClick={(e) => { scrollToTop() }}
            />
            <Box h="1rem" />
            <CleanMessages clearMessages={clearMessages} />
            {/* <button
             onClick={()=>alert(workspaces[currentWorkspaceIndex].name)}>ssss</button> */}
            <Box h="1rem" />
            <ExportMessages messages={workspaces[currentWorkspaceIndex].messages} />
            <Box h="1rem" />
            <ImportMessages ></ImportMessages>
            <Box h="1rem" />
            
            <Documents updateCurrentFile={
              (fileName) => {
                console.log(`current file ${fileName}`)
                setCurrentFile(fileName)
              }
            } />
           
            {isClient && awsProviderSettingsValue.model?.indexOf("claude-3") > -1 && (
               <>
               <Box h="1rem" />
              <ImportImage onImageChangeHandler={(mediaType, selectedImage) => {
                setImage(JSON.stringify(selectedImage))
                if (selectedImage) {
                  setEncodedImage(selectedImage.source?.data)
                  setMediaType(mediaType)
                }else{
                  setEncodedImage(null)
                  setMediaType(null)
                }


              }} />
              </>
            )}

            <Box h="1rem" />

            <IconButton
              right={4}
              icon={<BsArrowDownSquare />}
              aria-label="Toggle Theme"
              colorScheme="green"
              onClick={(e) => {
                scrollToBottom()
              }}
            />

          </Flex>
        </Flex>
      </Flex>



      <Flex
        justifyContent={"center"}
        direction="column"
      >

        {currentFile !== "" &&
          <div>
            <center><Icon as={MdAttachFile} /> {currentFile}</center>
          </div>
        }
        <Textarea
          ref={chatInput}
          placeholder={`Enter here ......`}
          ml="-50px"
          size="md"
          resize="none"
          rows={3}
          w="70vw"
          bg={isDark ? "" : "gray.200"}
          variant="brandPrimary"
          onChange={(e) => debounced(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (chatInput.current && chatInput.current.value) {
                sendMessage(chatInput.current.value);
                chatInput.current.value = "";
              }
            }
          }}
        />


      </Flex>


    </Flex>

  )
}


export default Chat;