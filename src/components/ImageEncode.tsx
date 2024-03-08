import React, { useEffect,useState } from 'react';
import { Image as ChakraImage ,Button,Box} from '@chakra-ui/react';

interface ImageEncoderProps {
    onImageChangeHandler: (encodedImageObject: any) => void;
  }

const ImageEncoder:React.FC<ImageEncoderProps> = ({ onImageChangeHandler }) => {
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

  // Call the onImageChangeHandler function with the encodedImageObject when it changes
  useEffect(() => {
    if (encodedImageObject) {
      onImageChangeHandler(encodedImageObject);
    }
  }, [encodedImageObject, onImageChangeHandler]);

  return (
    <Box>
      <input type="file" onChange={handleFileChange} />
      {encodedImage && <ChakraImage width={"20%"} src={`data:${mediaType};base64,${encodedImage}`} alt="selected" />}
      <Button onClick={handleImageReset}>Reset Image</Button>
      
    </Box>
  );
};

export default ImageEncoder;
