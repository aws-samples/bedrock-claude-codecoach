import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { TextLoader } from "langchain/document_loaders/fs/text";

const truncateString= (str: string, maxChars: number): string => {
    if (str.length <= maxChars) {
      return str;
    }
    return str.slice(0, maxChars) + '...'; 
  }

  
interface FileInputProps {
  fileType: "text" | "csv"| "url" | "youtube" | "pdf" ;
  fileName: string;
  filePath: string;
}

const ContentLoader = async (props: FileInputProps) => {
  if (props.fileType === "pdf") {
    const loader = new PDFLoader(props.filePath, {
      splitPages: false,
    });

    const docs = await loader.load();
    let contents = "";
    docs.map((doc) => {
      contents += " " + doc.pageContent;
    });
    return contents;
  }else if(props.fileType === "csv"){
    const loader = new CSVLoader(
        props.filePath
      );
      const docs = await loader.load();
      let contents = "";
      docs.map((doc) => {
        contents += " " + doc.pageContent;
      });
      return contents;
  }else {
    const loader = new TextLoader(
        props.filePath
      );
      const docs = await loader.load();
      let contents = "";
      docs.map((doc) => {
        contents += " " + doc.pageContent;
      });
      return contents;
  }

};

export { ContentLoader };

export type { FileInputProps };