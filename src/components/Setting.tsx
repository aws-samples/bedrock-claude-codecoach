import { useState, useRef, useEffect } from "react";

import {useColorMode, Input, Icon, IconButton, Box, Button, Select,  Tabs, TabList, TabPanels, Tab, TabPanel} from "@chakra-ui/react";
import { IoSettingsOutline } from "react-icons/io5"



import { BsRobot} from "react-icons/bs";

import { useSetRecoilState, useRecoilValue } from "recoil";
import { authSettings, authState } from "../state"

import Alert from "./Alert"

const Setting = () => {

    const { colorMode } = useColorMode()
    const isDark = colorMode === 'dark'

    const [isOpen, setIsOpen] = useState(false);
    const cancelRef = useRef<HTMLButtonElement>(null);

    const [akValue, setAkValue] = useState("");
    const [skValue, setSkValue] = useState("");
    const [cognitoIDValue, setCognitoIDValue] = useState("");
    const [cognitoRegionValue, setCognitoRegionValue] = useState("us-east-1");
    const [aiRole, setAIRole] = useState("CODECOACH")
    const [callerValue, setCallerValue] = useState("");

    const setAuthSettings = useSetRecoilState(authSettings)
    const auth = useRecoilValue(authState)

    const [authType, setAuthType] = useState(auth.role === "admin" ? "IAMROLE" : "AKSK");


    const rebotoColor=()=>{
        if(aiRole=="OPSCOACH"){
            return isDark?"orange.300":"orange.600"
        }else if(aiRole=="NORMAL"){
            return isDark?"green.300":"green.600"
        }else{
            return isDark?"blue.300":"blue.600"
        }

    }

    const onClose = () => setIsOpen(false);

    const handleAuthTypeChange = (e) => {
        setAuthType(e.target.value);
        setCallerValue("")
    };

    const handleCognitoRegionChange = (e) => {
        setCognitoRegionValue(e.target.value);
        if (callerValue !== "") {
            setCallerValue("")
        }

    };

    const handleAIRoleChange = (e) => {
        setAIRole(e.target.value);
       

    };

    const handleSaveClick = (e) => {
        setAuthSettings({ authType, akValue, skValue, cognitoIDValue, cognitoRegionValue,aiRole })
        setIsOpen(false)
    };


    const handleTestClick = () => {
        fetch("/api/caller", {
            method: "POST",
            body: JSON.stringify({ authType, akValue, skValue, cognitoIDValue, cognitoRegionValue }),
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
                    <>
                        <Tabs>
                            <TabList>
                                <Tab>Auth</Tab>
                                <Tab>Role</Tab>
                            </TabList>

                            <TabPanels>
                                <TabPanel>
                                    Settings {authType}
                                    <Select value={authType} id="auth-type" onChange={handleAuthTypeChange}>
                                        {auth.role === "admin" && <option value="IAMROLE">IAM ROLE</option>}

                                        <option value="AKSK">AK/SK</option>
                                        <option value="COGNITO">Cognito</option>
                                    </Select>
                                    {authType === "AKSK" && (
                                        <>
                                            <Box mt="10px">
                                                <label htmlFor="ak">AK:</label>
                                                <Input type="text" id="ak" value={akValue} onChange={(e) => setAkValue(e.target.value)} />
                                            </Box>
                                            <Box>
                                                <label htmlFor="sk">SK:</label>
                                                <Input type="text" id="sk" value={skValue} onChange={(e) => setSkValue(e.target.value)} />
                                            </Box>
                                        </>
                                    )}

                                    {authType === "COGNITO" && (
                                        <Box mt="10px">
                                            <label htmlFor="cognito">Cognito Region:</label>
                                            <Select value={cognitoRegionValue} id="cognito-region" onChange={handleCognitoRegionChange}>
                                                <option value="us-east-1">N. Virginia</option>
                                            </Select>
                                            <label htmlFor="cognito">Cognito ID:</label>
                                            <Input type="text" id="cognito" value={cognitoIDValue} onChange={(e) => setCognitoIDValue(e.target.value)} />
                                        </Box>
                                    )}
                                    <Box mt="20px">
                                        Caller Identity: {callerValue}
                                    </Box>
                                </TabPanel>
                                <TabPanel>
                                <Box mt="10px">
                                            <label htmlFor="aiRole">AI Role :</label>
                                            <Select value={aiRole} id="aiRole" onChange={handleAIRoleChange}>
                                                <option value="CODECOACH">Code Coach</option>
                                                <option value="OPSCOACH">DevOps Coach</option>
                                                <option value="NORMAL">Normal</option>
                                            </Select><br/>
                                            <Icon as={BsRobot} boxSize="24px" color={rebotoColor()}/>
                                        </Box>
                                </TabPanel>
                                
                            </TabPanels>
                        </Tabs>

                    </>
                }

                childrenButton={
                    <>
                        <Button colorScheme="blue" ml={3} onClick={handleTestClick}>
                            Test
                        </Button>

                        <Button colorScheme="red" ml={3} isDisabled={callerValue === ""} onClick={handleSaveClick}>
                            Save
                        </Button>
                    </>
                }

            />

        </>
    );
};

export default Setting;
