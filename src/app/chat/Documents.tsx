'use client'

import { useEffect, useState, useRef } from "react";
import { Input, IconButton, Button } from "@chakra-ui/react";

import { MdOutlineFolderCopy } from "react-icons/md";

import Alert from "@components/Alert"

interface FileProps {
  file: string;
  size: number;
}


interface DocumentsProps {
  updateCurrentFile: (fileName: string) => void;
}



const Documents = (props: {
  updateCurrentFile: (fileName: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false)
  const [files, setFiles] = useState<FileProps[]>([]);
  const [selectedId, setSelectedId] = useState("");


  const onClose = () => setIsOpen(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onExport = () => {
    onClose();

  }


  const loadFilelist = () => {
    fetch(`/api/documents`)
      .then((response) => response.json())
      .then((data) => {
        setFiles(data.files);
      })
      .catch((error) => console.error("Error uploading file:", error))
      .finally(() => { });
  };


  const onImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    // const reader = new FileReader();

    // reader.onload = () => {
    //   const importedMessages = JSON.parse(reader.result as string);
    // };

    // reader.readAsText(file);
    uploadFile(file, 256 * 1024);
  }

  const deleteDocument = async (file: string) => {
    if (confirm(`Are you sure you want to delete ${file} ?`)) {
      try {
        const response = await fetch(`/api/documents?file=${file}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          // handle successful delete
          loadFilelist();
        } else {
          // handle error
        }
      } catch (error) {
        console.log(error);
      }
    }
  };


  const uploadFile = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const formData = new FormData();



      reader.onload = (readerEvent: any) => {
        console.log("File load successfully");
        const fileContent = readerEvent.target.result;
        formData.append("file", file, file.name);

        fetch(`/api/documents`, {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((data) => {
            const { file, size } = data;
            if (file) {
              const exists = files.some((f) => f.file === file);

              if (!exists) {
                setFiles([...files, { file: file, size }]);

              }
            }
          })
          .catch((error) => console.error("Error uploading file:", error))
          .finally(() => { });

        resolve(fileContent);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };


  useEffect(() => {
    setIsClient(true)
    loadFilelist();

  }, [])

  return (
    <>
      <IconButton
        right={4}
        icon={<MdOutlineFolderCopy />}
        aria-label="Toggle Theme"
        colorScheme="green"
        onClick={() => setIsOpen(true)}
      />
      <Alert isOpen={isOpen} onClose={onClose} title="Documents"
        childrenBody={
          <>
            {selectedId !== "" && <div>Current: {selectedId}<br />{" "}<br /></div>}
            {files.length === 0 &&
              <div> {"You can upload document . "}</div>
            }

            {files.length > 0 &&
              <div>
                <Button colorScheme="blue" mb={"3"} onClick={() => {
                  setSelectedId("")
                  props.updateCurrentFile("")
                }} size={"xs"}>Reset</Button>

                <hr /><br />{" "} </div>
            }

            {files.length > 0 &&
              files.map((document, idx) => (
                <div key={document.file}>
                  <input
                    type="radio"
                    id={idx.toString()}
                    onChange={() => {
                      // props.onDocumentSelect(document.file);
                      setSelectedId(document.file);
                      props.updateCurrentFile(document.file)
                    }}
                    checked={selectedId === document.file}
                  />&nbsp;&nbsp;
                  {document.file} , size: {(document.size / 1024).toFixed(2)}/kb{" "}
                  <Button colorScheme="red" onClick={() => {
                    deleteDocument(document.file);
                  }} size={"xs"}>X</Button>

                  <br />{" "} <br />
                </div>
              ))

            }



          </>
        }
        childrenButton={
          <>
            <hr />
            <Input ml={4} type="file" accept="application/pdf,text/plain,text/markdown" onChange={onImport} />
          </>

        }
      ></Alert>

    </>
  );
};

export default Documents;
