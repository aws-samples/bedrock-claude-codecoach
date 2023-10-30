import {  useRef  } from "react";

import {Button, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Textarea } from "@chakra-ui/react";


interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  childrenBody?: React.ReactNode | string;
  childrenButton?: React.ReactNode;
}



const Alert = ({ isOpen, onClose, title, childrenBody,childrenButton }: AlertProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent maxW="600px">
          <AlertDialogHeader>{title}</AlertDialogHeader>
          <AlertDialogBody>{childrenBody}</AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Close
            </Button>
            {childrenButton}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};




  



export default Alert;


