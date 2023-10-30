'use client'

import { useEffect, useState,useRef } from "react";
import { IconButton,Button } from "@chakra-ui/react";

import { MdOutlineFileDownload } from "react-icons/md";

import Alert from "../../components/Alert"

interface ChatMessage {
    question: string
    reply: string
  }

  interface ExportMessagesProps {
    messages: ChatMessage[];
  }



const ExportMessages = ({messages}:ExportMessagesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient,setIsClient] = useState(false)
  
 
  const onClose = () => setIsOpen(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onExport = () => {
    exportJson(messages, "messages.json")
    onClose();
  
  }
  const exportJson = (data: ChatMessage[], fileName: string) => {
    
      const jsonData = JSON.stringify(data);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
  
      link.href = url;
      link.download = fileName;
      link.click();
  
      URL.revokeObjectURL(url);
    }
  
  

  useEffect(() => {
    setIsClient(true)
 },[])

  return (
    <>
    <IconButton
            right={4}
            icon={ <MdOutlineFileDownload/>}
            aria-label="Toggle Theme"
            colorScheme="green"
            onClick={() => setIsOpen(true)}
            />
      <Alert isOpen={isOpen} onClose={onClose} title="Export Messages"
      childrenBody={"Are you sure you want to export this item?"}
      childrenButton={
        <>
         <Button colorScheme="green" onClick={onExport} ml={3}>
                Export
              </Button>
        </>
      }
      ></Alert>
      
    </>
  );
};

export default ExportMessages;
