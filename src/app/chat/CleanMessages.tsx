import { useState, useRef } from "react";
import { IconButton, Button } from "@chakra-ui/react";

import { MdOutlineDeleteForever } from "react-icons/md";

import Alert from "../../components/Alert"


interface CleanMessagesProps {
  clearMessages: () => void;
}


interface CleanMessageByIndexProps {
  index: number;
  cleanMessageByIndxe: (index: number) => void;
}

const CleanMessages = ({ clearMessages }: CleanMessagesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => setIsOpen(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onDelete = () => {
    clearMessages();
    onClose();

  }
  return (
    <>
      <IconButton
        right={4}
        icon={<MdOutlineDeleteForever />}
        aria-label="Toggle Theme"
        colorScheme="green"
        onClick={() => setIsOpen(true)}
      > Open Dialog</IconButton>
      <Alert isOpen={isOpen}
        onClose={onClose}
        title={"Clean Messages"}
        childrenBody={"Are you sure you want to clean All messages ?"}
        childrenButton={
          <>
            <Button colorScheme="red" onClick={onDelete} ml={3}>
              Delete
            </Button></>
        }
      ></Alert>
    </>
  );
};


export const CleanMessagesByIndex = ({ index, cleanMessageByIndxe }: CleanMessageByIndexProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => setIsOpen(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onDelete = () => {
    cleanMessageByIndxe(index);
    onClose();
  }
  return (
    <>
      <IconButton
        right={4}
        icon={<MdOutlineDeleteForever />}
        aria-label="Toggle Theme"
        size="sm"
        onClick={() => setIsOpen(true)}
      > Open Dialog</IconButton>

    <Alert isOpen={isOpen}
        onClose={onClose}
        title={"Clean this message"}
        childrenBody={"Are you sure you want to clean this message  ?"}
        childrenButton={
          <>
            <Button colorScheme="red" onClick={onDelete} ml={3}>
              Delete
            </Button></>
        }
      ></Alert>
    </>
  );
};


export default CleanMessages;
