import { FormEvent, useRef, useState } from "react";

interface Props {
  onSendMessages: (message: string) => void;
  placeholder: string;
  disableCorrection?: boolean;
  accept?: string; //referenciar aca, ojo!!!!!!!!!
}

const TextBoxFile = ({
  onSendMessages,
  placeholder,
  disableCorrection = false,
  accept,
}: Props) => {

  const [message, setMessage] = useState("");
  const[selectedFile,setSelectedFile] = useState <File | null >()
  const inputFileRef = useRef<HTMLInputElement>(null);

  const HandleSendMessages = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const message = formData.get("message")?.toString() || "";
    if (message.trim()) {
      onSendMessages(message);
      setMessage("");
      event.currentTarget.reset();
    }

    if (message.trim().length === 0) return;
  };

  return (
    <form
      onSubmit={HandleSendMessages}
      className="flex items-center h-24 rounded-lg bg-white w-full px-4"
    >
      <div className="mr-3">
        <button
          type="button"
          className="flex items-center justify-center text-gray-400"
          onClick={() => inputFileRef.current?.click()}
        >
          <i className=" fa-solid fa-paperclip text-xl"></i>
        </button>

        <input 
          type="file" 
          ref={inputFileRef} 
          accept = {accept}
          onChange={(e) => setSelectedFile(e.target.files?.item(0))}
          hidden
        />
      </div>

      <div className="flex-grow">
        <input
          type="text"
          autoFocus
          name="message"
          className="w-full border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 px-4 py-2 h20"
          placeholder={placeholder}
          autoComplete={disableCorrection ? "on" : "off"}
          autoCorrect={disableCorrection ? "on" : "off"}
          spellCheck={disableCorrection ? "true" : "false"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>



      <button
        className="btn-primary ml-3 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg h-12"
        // revisar aca el disable en caso que se necesite siempre cargado
        disabled = {!selectedFile}
        >
      {
       (selectedFile)
       ? <span className="mr-2">{selectedFile.name.substring(0,10) + '...'}</span>
       : <span className="mr-2">Enviar</span>

      }
      </button>
    </form>
  );
};

export default TextBoxFile;
//arreglos

