"use client"
import { useEffect, useRef, useState } from "react";
import { IconButton, Box } from "@chakra-ui/react";
import { MdOutlineTerminal } from "react-icons/md";


import Alert from "./Alert";



import { XTerm } from 'xterm-for-react'




const Terminal: React.FC = () => {


    const xtermRef = useRef<XTerm | null>(null);

    const [isClient, setIsClient] = useState(false);

    const [input,setInput] =useState("");


    useEffect(() => {
        setIsClient(true)
        
    }, [])


  

    

    



   
    const [isImportOpen, setIsImportOpen] = useState(false);


    const onImportClose = () => setIsImportOpen(false);




    return (
        <>

            <IconButton
                right={4}
                aria-label="Toggle Theme"
                colorScheme="green"
                icon={<MdOutlineTerminal/>}
                onClick={() => setIsImportOpen(true)}
            />
            { }


            <Alert
                isOpen={isImportOpen}
                onClose={onImportClose}
                title="Terminal"
                
                childrenBody={
                    <div style={{width:"500px"}}>
                        
                        {isClient && <Box width={"400px"}><XTerm
                            ref={xtermRef}
        
                            options={{
                                cursorBlink: true,
                                scrollback: 1000,
                            }}
                            addons={[]}
                            onData={(data) => {
                                //console.log('Data received:', data);
                                const code = data.charCodeAt(0);
                                // If the user hits empty and there is something typed echo it.
                                if (code === 13 ) {
                                    xtermRef.current.terminal.write(
                                        "\r\nYou typed: '" + input + "'\r\n"
                                    );
                                    xtermRef.current.terminal.write("codecoach@localhost$ ");
                                    setInput("")
                                } else if (code < 32 || code === 127) { // Disable control Keys such as arrow keys
                                    return;
                                } else { // Add general key press characters to the terminal
                                    xtermRef.current.terminal.write(data);
                                    setInput(input + data)
                                }
                            }}
                            onResize={(dims) => {
                                console.log('Terminal resized:', dims);
                            }}
                        /></Box>
}
                    </div>

                }
                

            />




        </>
    );
}

export default Terminal;
