"use client"

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Textarea,
    Button,
    Input,
    Heading,
    HStack,
    Spinner,
    Select
} from '@chakra-ui/react';

import ReactMarkdown from 'react-markdown';
import { useRecoilState, useRecoilValue } from 'recoil';


import { promptEditorResult, authSettings, authState } from "../../state";
import { CustomPromptTemplate, LoadPrompt } from '@utils/prompt';
import fetchRequest from '@utils/fetch';
import { useTranslation } from 'react-i18next';

interface MarkdownEditorProps {
    onChange: (value: string) => void;
    markdown: string;
}



const getKeys = (prompt: string): string[] => {
    const regex = /{(\w+)}/g;
    const keys: string[] = [];
    let match;

    while ((match = regex.exec(prompt)) !== null) {
        keys.push(match[1]);
    }

    return keys;
}


const replaceKeys = (
    prompt: string,
    input: { [key: string]: string }
): string => {
    return prompt.replace(/{(\w+)}/g, (match, key) => {
        return input[key] || match;
    });

}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    onChange,
    markdown
}) => {

    const authSettingsValue = useRecoilValue(authSettings)
    const auth = useRecoilValue(authState)

    const [keys, setKeys] = useState<string[]>([]);
    const [data, setData] = useState({});
    const [requestData, setRequestData] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [promptName, setPrompName] = useState("");
    const [selectedPromptName, setSelectedPrompName] = useState("no");
    const [isClient, setIsClient] = useState(false);
    
    const [claude3SystemRole, setClaude3SystemRole] = useState("");

    const selectRef = useRef<HTMLSelectElement>(null);

    const { t,i18n} = useTranslation();

   


    //const [promptTemplates, setPromptTemplates] = useRecoilState(promptTemplateState);

    const [promptTemplates, setPromptTemplates] = useState<CustomPromptTemplate[]>([]);



    const handleOnChange = (value: string) => {
        onChange(value)
        setKeys([...getKeys(value)])

    }

    const handlePromptListOnChange = (event) => {

        const name = event.target.value;
        const template = promptTemplates.find(t => t.name === name);


        if (name === "no") {
            handleOnChange("");
            setSelectedPrompName("no")
            setPrompName("")
            return;
        }
        setSelectedPrompName(name)
        setPrompName(name)
        handleOnChange(template.prompt);

    }

    const getPrompt = async () => {
        
        const result = await LoadPrompt(authSettingsValue)
        console.log(result)
        setPromptTemplates([...result])

    }







    const addTemplate = (promptTemplate: CustomPromptTemplate) => {
        const name = promptTemplate.name;
        const template = promptTemplate.prompt;

        const existing = promptTemplates.find(t => t.name === promptTemplate.name);
        if (existing) {
            console.log("existing", promptTemplate)
            setPromptTemplates(prev =>
                prev.map(t => t.name === name ? { ...t, promptTemplate: template } : t)
            );
        } else {
            console.log(promptTemplate)
            setPromptTemplates(prev => [...prev, promptTemplate]);
        }
    }

    const onSave = async () => {
        addTemplate({ name: promptName, prompt: markdown })
        setSelectedPrompName(promptName)
        try {
            const res: Response = await fetchRequest("POST", `/api/prompt`, btoa(JSON.stringify(authSettingsValue)), {
                name:promptName,
                prompt: markdown,
            });
            if (res.status !== 200) {
                console.log("error", res.status)
                return
            }
        }catch(e){

        }
    }


    const onReply = async (value: string) => {
        try {


            const res: Response = await fetchRequest("POST", `/api/bedrock/completion`, btoa(JSON.stringify(authSettingsValue)), {
                query: value,
                history: [],
                role: claude3SystemRole===""?authSettingsValue.roleType:claude3SystemRole,
                model: authSettingsValue.model,

            });
            if (res.status !== 200) {
                console.log("error", res.status)
                setSubmitting(false)
                return
            }
            const reader = res?.body?.getReader() as ReadableStreamDefaultReader;

            const decoder = new TextDecoder();
            let done = false;
            let metaData: unknown;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value);
                const hasMeta = chunkValue.includes('\n ###endjson### \n\n');
                if (hasMeta) {
                    const [metaDataStr, message] = chunkValue.split('\n ###endjson### \n\n');
                    metaData = JSON.parse(metaDataStr);
                    console.log(metaData, message.trim());

                } else {
                    console.log(chunkValue);
                    setMessage((pre) => {
                        return pre + chunkValue
                    })
                }

            }

        } catch (error) {
            console.log(error);
            setSubmitting(false)
        } finally {
            setSubmitting(false)
        }

    }

    const handleRemove = async () => {
        
        const selected = selectRef.current?.value;
       
        if(selected==="no"){
            return 
        }
        const template = promptTemplates.find(t => t.name === selected);
        
        if (!template){
            return 
        }
        console.log(selected,template.PK)
        try {

            const res: Response = await fetchRequest("DELETE", `/api/prompt`, btoa(JSON.stringify(authSettingsValue)), {
                promptID:template.PK
            });
            if (res.status !== 200) {
                console.log("error", res.status)
                return
            }
            
           
            
            getPrompt()
        }catch(e){

        }

       

        
    }

    useEffect(() => {
        setIsClient(true)
        getPrompt();
    }, [])

    useEffect(() => {
        setRequestData(replaceKeys(markdown, data))
        setKeys([...getKeys(markdown)])
    }, [data, markdown])


    return (
        <Box p={4}>
            <Heading>{t('Prompt Editor')}</Heading>
            <HStack spacing='24px'>
                <Textarea
                    value={markdown}
                    onChange={(e) => handleOnChange(e.target.value)}
                    height={400}
                />
                <Textarea
                    aria-label='Output'
                    readOnly
                    value={requestData}
                    onChange={(e) => handleOnChange(e.target.value)}
                    height={400}
                />

            </HStack>

            <Box mt={4} display="flex" alignItems="center"
            >
                {t('Template Name')}:  &nbsp; <Input width={"200px"} value={promptName} onChange={(e) => {
                    setPrompName(e.target.value)
                }} /> &nbsp;
                
                
                {t('Template List')}:  &nbsp;
                <Select w={"200px"} ref={selectRef} value={selectedPromptName} onChange={handlePromptListOnChange} >
                    <option value="no">------</option>
                    {isClient && promptTemplates.map((promptTemplate) => {
                        return <option value={promptTemplate.name} key={promptTemplate.PK}>{promptTemplate.name}</option>

                    })}

                </Select>

                <Button ml={"20px"} onClick={() => {
                    if (promptName !== "") {
                        onSave()
                    }
                }}>
                {t('Save')}</Button> &nbsp;

                
                <Button ml={"20px"} onClick={handleRemove}>{t('Remove')}</Button>
                <Button ml={"20px"} onClick={getPrompt}>{t('Refresh List')}</Button>


            </Box>
            

            <Box mt={4}
            >
              Model:  {authSettingsValue.model}  
            </Box>

            
            {authSettingsValue.model.indexOf("claude-3")>-1&&(<Box mt={2} display="flex" alignItems="center"
            >
                 {t('Claude3 System Role')}
              <Box  mt={"15px"}> &nbsp; <Input width={"600px"} value={claude3SystemRole} onChange={(e) => {
                            console.log(e.target.value)
                            setClaude3SystemRole(e.target.value)
                        }} />
            </Box>
            </Box>
            )}
                
            <Box mt={4}
            >
                
                {t('Prompt Parameters')}
                {keys.map((key) => {

                    return <Box key={key} mt={"15px"}>
                        <li >{key}: <Input width={"600px"} onChange={(e) => {
                            setData((pre) => {
                                return {
                                    ...pre,
                                    [key]: e.target.value
                                }
                            })
                        }} /></li>

                    </Box>
                })}
            </Box>
            <Box mt={4}
            >
                <HStack spacing='24px'>
                    {/* <Button onClick={() => handleOnChange('')}>Clear</Button> */}
                    <Button onClick={() => setMessage('')}>{t('Clear Output')}</Button>
                    <Button
                        disabled={submitting}
                        onClick={() => {
                            console.log(requestData)
                            setSubmitting(true)
                            onReply(requestData)
                        }}>
                        {submitting ? (
                            <Spinner />
                        ) : (
                            t('Submmit')
                        )}

                    </Button>

                </HStack>

            </Box>
            <ReactMarkdown >{message}</ReactMarkdown>



        </Box>
    );
}

const PromptTools = () => {

    //const [markdown, setMarkdown] = useState('');
    const [markdown, setMarkdown] = useRecoilState(promptEditorResult);

    return (
        <MarkdownEditor
            markdown={markdown}
            onChange={setMarkdown}
        />

    )
}




export default PromptTools;