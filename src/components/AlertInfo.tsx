import { useState, useRef, useEffect } from "react";

import { Alert, AlertIcon, AlertDescription, AlertTitle } from "@chakra-ui/react";



interface AlertInfoProps {
    isOpen: boolean,
    setIsOpen: (arg0:boolean)=>void;
    delayClose: number;
    title: string;
    desc: string;
    status: "error" | "info" | "loading" | "success" | "warning"
}

const AlertInfo = ({ isOpen,setIsOpen, delayClose, title, desc, status }: AlertInfoProps) => {
    
    const [alertOpen, setAlertOpen] = useState(isOpen)
    useEffect(()=>{
        if (isOpen){
            setAlertOpen(true)
            setTimeout(()=>{
                setAlertOpen(false)
                setIsOpen(false)
            },delayClose*1000)
        }


    },[isOpen])
    return (
        <>
            {alertOpen &&
                <Alert status={status} >
                    <AlertIcon />
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>{desc}</AlertDescription>
                </Alert>
            }
        </>
    );
};

export default AlertInfo 