import { useState,useEffect } from "react";

import { useColorMode, Icon, IconButton, Box, Button, Input,Select, Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import { IoSettingsOutline } from "react-icons/io5"



import { BsRobot } from "react-icons/bs";
import { useRecoilState, useRecoilValue } from "recoil";

import { authSettings, authState } from "../state"


import { LoadPrompt } from "@utils/prompt";
import fetchRequest from '@utils/fetch';
import { rebotoColor } from "./RobotIconColor";
import Alert from "./Alert"
interface PromptTemplate {
    PK?: string;
    name: string;
    prompt: string;
}

interface Password {
    oldPassword: string,
    newPassword: string,
    newPasswordConfirm:string
}

const Setting = (props) => {

    const { colorMode } = useColorMode()
    const isDark = colorMode === 'dark'

    const [isOpen, setIsOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [passwordReady, setPasswordReady] = useState(false);

    const [myCopilot, setMyCopilot] = useState("no");
    const [aiRole, setAIRole] = useState("CODECOACH")
    const [callerValue, setCallerValue] = useState("");
    const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);

    
    const [tabIndex, setTabIndex] = useState(0);
    
    const [password, setPassword] = useState<Password>({oldPassword:"",newPassword:"",newPasswordConfirm:""})

    //RecoiValue State
    const [authSettingsValue,setAuthSettings] = useRecoilState(authSettings)
    const auth = useRecoilValue(authState)

    const [authType, setAuthType] = useState(auth.role === "admin" ? "IAMROLE" : "AKSK");
   

    const onClose = () => setIsOpen(false);
    const handleAuthTypeChange = (e) => {
        setAuthType(e.target.value);
        setCallerValue("")
    };

    const handleAIRoleChange = (e) => {

        if(e.target.value!=="no"){
            setMyCopilot("no")
        }
        setAIRole(e.target.value);
        
    };

    const handleSaveClick = () => {
        const roleType= myCopilot==="no"?"system":"custom"
        const template = promptTemplates.find(t => t.name === myCopilot);
        const role = myCopilot==="no"?aiRole:template.PK
        setAuthSettings({ authType, aiRole:role,roleType })
        setCallerValue("")
        setIsOpen(false)
        
    };


    const handleTestClick = () => {
        fetch("/api/caller", {
            method: "POST",
            body: JSON.stringify({ authType }),
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const { me } = data
                if (me === "") {
                    setCallerValue("Auth failed, can't get caller identity")
                } else {
                    setCallerValue(me)
                }


            })
            .catch((error) => {
                console.error(error);
            });
    };

    const  handleSavePasswordClick = async () => {
        try {
            const res: Response = await fetchRequest("POST", `/api/password`, btoa(JSON.stringify(authSettingsValue)), {
                oldPassword:password.oldPassword,
                newPassword: password.newPassword,
            });
            if (res.status !== 200) {
                console.log("error", res.status)
                return
            }else{
                setPassword({oldPassword:"",newPassword:"",newPasswordConfirm:""})
                setPasswordReady(false)
            }
        }catch(e){
           
        }
    };

    const handlePromptListOnChange = (event) => {

        const name = event.target.value;
        const template = promptTemplates.find(t => t.name === name);


        if (name !== "no") {
            
            setAIRole("no")
            setMyCopilot(name)
            console.log(template.PK)
            return;
        }
        
    }

    const getPrompt = async () => {
        const result = await LoadPrompt(authSettingsValue)
        console.log(result)
        setPromptTemplates([...result])

    }

    useEffect(() => {
        if(password.oldPassword!=""&&password.newPassword!=""&&password.newPasswordConfirm!=""){
            if(password.oldPassword!=password.newPassword&&password.oldPassword!=password.newPasswordConfirm){
                if(password.newPassword===password.newPasswordConfirm){
                  return  setPasswordReady(true)
                }   
            }
        }
        setPasswordReady(false)
        
    }, [password])
    
    useEffect(() => {
        setIsClient(true)
        if(promptTemplates.length===0){
            getPrompt()
        }
        
    }, [])

    return (
        <>

            <IconButton
                right={2}
                icon={<IoSettingsOutline />}
                aria-label="Toggle Theme"
                onClick={() => setIsOpen(true)}
            > Open Dialog</IconButton>
            <Alert isOpen={isOpen} onClose={onClose} title="Config"
                childrenBody={

                    <Tabs index={tabIndex} onChange={(index:number)=>{setTabIndex(index)}}>
                        <TabList>
                            <Tab>AWS</Tab>
                            <Tab>Copilots</Tab>
                            <Tab>Password</Tab>
                        </TabList>

                        <TabPanels>
                            <TabPanel>
                                Settings {authType}
                                <Select value={authType} id="auth-type" onChange={handleAuthTypeChange}>
                                    <option value="IAMROLE">IAM ROLE/SharedProfile</option>
                                </Select>
                                <Box mt="20px">
                                    Caller Identity: {callerValue}
                                </Box>
                            </TabPanel>
                            <TabPanel>
                                <Box mt="10px">
                                    <label htmlFor="aiRole">Built-in:</label>
                                    <Select value={aiRole} id="aiRole" onChange={handleAIRoleChange}>
                                        <option value="no">------</option>
                                        <option value="CODECOACH">Code Coach</option>
                                        <option value="AWSCLICOACH">AWS CLI Expert</option>
                                        {/* <option value="AUTOGEN">AUTOGEN</option> */}
                                        <option value="NORMAL">Claude2 Assistant</option>
                                    </Select><br />
                                    <label htmlFor="aiRole">My Copilots:</label>

                                    <Select   value={myCopilot} onChange={handlePromptListOnChange} >
                                        <option value="no">------</option>
                                        {isClient && promptTemplates.map((promptTemplate) => {
                                            return <option value={promptTemplate.name} key={promptTemplate.PK}>{promptTemplate.name}</option>

                                        })}

                                    </Select>

                                    <br />
                                    <Icon as={BsRobot} boxSize="24px" color={rebotoColor(isDark,myCopilot==="no"?"system":"custom",aiRole)} /> 
                                    
                                </Box>
                            </TabPanel>
                            <TabPanel>
                                Old Password 
                                <Input
                                    type= "password"
                                    value={password.oldPassword}
                                    onChange={(e) => {
                                    setPassword((prev)=>{
                                        return {...prev, oldPassword:e.target.value}
                                    })
                                    }}
                                />
                                New Password 
                                <Input
                                    type= "password"
                                    value={password.newPassword}
                                    onChange={(e) => {
                                        setPassword((prev)=>{
                                            return {...prev, newPassword:e.target.value}
                                        })
                                    }}
                                />
                                New Password Confirm
                                <Input
                                    type= "password"
                                    value= {password.newPasswordConfirm}
                                    onChange={(e) => {
                                        setPassword((prev)=>{
                                            return {...prev, newPasswordConfirm:e.target.value}
                                        })
                                    }}
                                />
                               
                            </TabPanel>

                        </TabPanels>
                    </Tabs>

                }

                childrenButton={  
                    <>
                      {tabIndex==2?(<Button colorScheme="red" ml={3} onClick={handleSavePasswordClick} isDisabled={!passwordReady}>
                            Save Password
                        </Button>
                        ):
                       (
                       <><Button colorScheme="blue" ml={3} onClick={handleTestClick}>
                            Test
                        </Button>
                        
                        <Button colorScheme="red" ml={3} isDisabled={callerValue === ""} onClick={handleSaveClick}>
                            Save
                        </Button> </>
                       )
                       }
                    </>
                   
                }

            />

        </>
    );
};

export default Setting;
