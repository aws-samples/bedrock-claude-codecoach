import { useEffect,useState } from "react";
import { IconButton, Input,Image as ChakraImage } from "@chakra-ui/react";
import {  MdOutlineImage,MdOutlineHideImage} from "react-icons/md";


import Alert from "../../components/Alert";

interface ImageEncoderProps {
    onImageChangeHandler: (encodedImageObject: any) => void;
  }


const ImportImage:React.FC<ImageEncoderProps> = ({ onImageChangeHandler }) => {

    const [image, setImage] = useState<File | null>(null);
    const [encodedImage, setEncodedImage] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<string | null>(null);
  
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files ? event.target.files[0] : null;
  
      if (file) {
        const mediaType = file.type;
        if (mediaType.indexOf("image/") > -1) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setEncodedImage(base64String.split(',')[1]);
            setMediaType(mediaType);
          };
          reader.readAsDataURL(file);
          setImage(file);
        } else {
          console.log("Only support image");
        }
      }
    };
  
    const handleImageReset = () => {
      setImage(null);
      setEncodedImage(null);
      setMediaType(null);
      onImageChangeHandler(null);
    };
  
    const encodedImageObject = encodedImage && mediaType ? {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: encodedImage,
      },
    } : null;

  const [isImportOpen, setIsImportOpen] = useState(false);

  
  const onImportClose = () => setIsImportOpen(false);

    
  useEffect(() => {
    if (encodedImageObject) {
      onImageChangeHandler(encodedImageObject);
    }
  }, [encodedImageObject, onImageChangeHandler]);
  


  return (
    <>
      
      <IconButton
         right={4}
         aria-label="Toggle Theme"
         colorScheme="green"
        icon={<MdOutlineImage />}
        onClick={() => setIsImportOpen(true)} 
      />
    { }
    <IconButton
         right={1}
         aria-label="Toggle Theme"
         colorScheme="green"
        icon={<MdOutlineHideImage />}
        onClick={handleImageReset} 
      />

      <Alert
        isOpen={isImportOpen}
        onClose={onImportClose}
        title="Select a image file"
        childrenBody="Select a file to upload"
        childrenButton={
          <Input ml={4} type="file" onChange={handleFileChange} />
        }

        />

     {encodedImage && <ChakraImage width={"20%"} src={`data:${mediaType};base64,${encodedImage}`} alt="selected" />}
     
      

    </>
  );
}

export default  ImportImage  ;
