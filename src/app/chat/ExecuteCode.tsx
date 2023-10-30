import { useState,useRef } from "react";
import { IconButton,Box,Button, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Textarea } from "@chakra-ui/react";
import CodeMirror, { lineNumbers } from '@uiw/react-codemirror';

import { VscTerminalPowershell } from "react-icons/vsc";
import {githubLight} from '@uiw/codemirror-theme-github';
import {python} from "@codemirror/lang-python";

import {fetchRequestCode} from "../../utils/fetch";
import {runResult} from "../../state";
import { useSetRecoilState } from "recoil";


export const baseURL = process.env.NETX_PUBLIC_API_SERVER_URL || 'http://localhost:3000';



interface ExcuteCodeProps {
  language: string;
  code:string;
}

const ExecuteCodeButton = ({language,code}:ExcuteCodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage]=useState("");
  
  const onClose = () => setIsOpen(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState(code);
  const [output, setOutput] = useState('');

  const setRunResult=useSetRecoilState(runResult);
  
 
  const onExecute = () => {
    
    console.log(language,code)

    
    //onClose();

    fetchRequestCode("POST", `${baseURL}/api/execute`, {
        language: language,
        code: text
      })
        .then((res) => res.text())
        .then((body) => {
          const {run }=JSON.parse(body);
          
          if(run){
            if(run.stderr!==""){
              setErrorMessage(`language: ${language}\n code: ${text}\n stdout: ${run.stdout} \nstderr: ${run.stderr}, please fix this issue \n`)
            }
            setOutput(`stdout: ${run.stdout} \nstderr: ${run.stderr} \n`);
          }
 
        });
  
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
          <AlertDialogContent maxW="600px" >
            <AlertDialogHeader>Confirmation</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to execute this [{language}]code  ?

              <CodeMirror
                        value={code}
                        onChange={(newValue) => setText(newValue)}
                        theme={githubLight}
                        extensions={[python()]}
                        basicSetup={{autocompletion: true}}
                        minWidth={'300px'}
                        minHeight={'300px'}
                        maxHeight={'300px'}
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
                Close
              </Button>
              {errorMessage!==""&&
              <Button ml={3} onClick={
                ()=>{
                  setRunResult(errorMessage)
                }
                }>
               How to fix
              </Button>
              }
              <Button colorScheme="red" onClick={onExecute} ml={3}>
                Execute
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default ExecuteCodeButton;
