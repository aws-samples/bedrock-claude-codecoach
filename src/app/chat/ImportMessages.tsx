import { useState } from "react";
import { IconButton, Input } from "@chakra-ui/react";
import {  MdOutlineFileUpload } from "react-icons/md";
import { useSetRecoilState } from 'recoil';
import { chatMessagesState } from "../../state"

import Alert from "../../components/Alert";

interface ChatMessage {
  question: string;
  reply: string; 
}

interface ImportMessagesProps {
  messages: ChatMessage[];
}

const ImportMessages = () => {

  const setMessages = useSetRecoilState(chatMessagesState);

  const [isImportOpen, setIsImportOpen] = useState(false);

  
  const onImportClose = () => setIsImportOpen(false);

 
  
  const onImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0]; 
    const reader = new FileReader();

    reader.onload = () => {
      const importedMessages = JSON.parse(reader.result as string) as ChatMessage[];
      console.log(importedMessages)
      setMessages(importedMessages)
      onImportClose();
    };
    
    reader.readAsText(file);
  }

  return (
    <>
      
      <IconButton
         right={4}
         aria-label="Toggle Theme"
         colorScheme="green"
        icon={<MdOutlineFileUpload />}
        onClick={() => setIsImportOpen(true)} 
      />

     
      <Alert
        isOpen={isImportOpen}
        onClose={onImportClose}
        title="Import Messages"
        childrenBody="Select a file to import"
        childrenButton={
          <Input ml={4} type="file" onChange={onImport} />
        }
      />

    </>
  );
}

export default ImportMessages ;
