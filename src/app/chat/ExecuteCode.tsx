import { useState,useRef,useEffect } from "react";
import { IconButton,Box,Button, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Spinner } from "@chakra-ui/react";
import CodeMirror from '@uiw/react-codemirror';

import { VscTerminalPowershell } from "react-icons/vsc";
import {githubLight} from '@uiw/codemirror-theme-github';
import {python} from "@codemirror/lang-python";

import { useTranslation } from "react-i18next";
import { useSetRecoilState } from "recoil";


import {fetchRequestCode} from "../../utils/fetch";
import {runResult} from "../../state";



export const baseURL = process.env.API_SERVER_URL || '';

interface ExcuteCodeProps {
  language: string;
  code:string;
  setCode:any;
}

const ExecuteCodeButton = ({language,code,setCode}:ExcuteCodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage]=useState("");

  const onClose = () => setIsOpen(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [currentCode, setCurrentCode] = useState(code);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [canExecute, setCanExecute] = useState(false);
  useEffect(() => {
    fetch("/api/execute").then((response) => response.json()).then((capabilities) => {
      setCanExecute(capabilities.enabled && capabilities.languages?.includes(language));
    }).catch(() => setCanExecute(false));
  }, [language]);

  const {t} = useTranslation();




  const setRunResult=useSetRecoilState(runResult);

  const onSave = ()=>{
    setCode(currentCode)
  }

  const onExecute =async () => {

    console.log(language,code)
    setLoading(true)

    try {
      const res = await fetchRequestCode("POST", `${baseURL}/api/execute`, {
        language: language,
        code: currentCode
      });
  
      const { run }= await res.json();
      if (run) {
        if (run.stderr !== "") {
          setErrorMessage(`language: ${language}\n code: ${currentCode}\n stdout: ${run.stdout} \nstderr: ${run.stderr}, please fix this issue \n`);
        }
        setOutput(`stdout: ${run.stdout} \nstderr: ${run.stderr} \n`);
      }
    } catch (error) {
      setOutput("Code execution could not be completed.");
    } finally {
      setLoading(false);
    }

  }
  return (
    <>
    <IconButton
            right={4}
            icon={ <VscTerminalPowershell />}
            aria-label="Toggle Theme"
            onClick={() => setIsOpen(true)}
            > Open Dialog</IconButton>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent maxW="700px" >
            <AlertDialogHeader>Code Execute </AlertDialogHeader>
            <AlertDialogBody>
              {canExecute ? `Run this ${language} code without network access?` : "Code execution is unavailable. You can still edit and save this code."}
              <CodeMirror
                        value={code}
                        onChange={(newValue) => setCurrentCode(newValue)}
                        theme={githubLight}
                        extensions={[python()]}
                        basicSetup={{autocompletion: true}}
                        minWidth={'600px'}
                        minHeight={'400px'}
                        
                    />
            <Box>
             output:
            </Box>
             <CodeMirror
                        value={output}
                        theme={githubLight}
                        basicSetup={{autocompletion: true,lineNumbers:false}}
                        minWidth={'100px'}
                        minHeight={'100px'}
                        maxHeight={'100px'}

                    />

            </AlertDialogBody>
            <AlertDialogFooter>

              <Button ref={cancelRef} onClick={onClose}>
              {t('Close')}
              </Button>
              <Button ml={3} colorScheme="green" onClick={onSave}>
                {t('Save')}
              </Button>
              {errorMessage!==""&&
              <Button ml={3} 
              colorScheme="red"
              onClick={
                ()=>{
                  setRunResult(errorMessage)
                }
                }>
               {t('How to fix')}
              </Button>
              }
              
              <Button isDisabled={!canExecute} isLoading={loading} colorScheme="orange" onClick={onExecute} ml={3}>
              {t('Execute')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default ExecuteCodeButton;
