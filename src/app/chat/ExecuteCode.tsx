import { useState,useRef } from "react";
import { IconButton,Box,Button, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Spinner } from "@chakra-ui/react";
import CodeMirror from '@uiw/react-codemirror';

import { VscTerminalPowershell } from "react-icons/vsc";
import {githubLight} from '@uiw/codemirror-theme-github';
import {python} from "@codemirror/lang-python";

import {fetchRequestCode} from "../../utils/fetch";
import {runResult} from "../../state";
import { useSetRecoilState } from "recoil";


export const baseURL = process.env.NETX_PUBLIC_API_SERVER_URL || '';

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
      // Handle any errors here
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
              Are you sure you want to execute this [{language}]code  ?
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
                Close
              </Button>
              <Button ml={3} colorScheme="green" onClick={onSave}>
                Save
              </Button>
              {errorMessage!==""&&
              <Button ml={3} 
              colorScheme="red"
              onClick={
                ()=>{
                  setRunResult(errorMessage)
                }
                }>
               How to fix
              </Button>
              }
              
              <Button isLoading={loading} colorScheme="orange" onClick={onExecute} ml={3}>
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
