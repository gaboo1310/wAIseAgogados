import { useState } from "react";
import GptMessages from "../components/chat-bubles/GptMessages";
import MyMessages from "../components/chat-bubles/MyMessages";
import LoaderTyping from "../components/loader/LoaderTyping";
import TextBox from "../components/textMessagesBox/TextBox";


interface Messages {
  text: string;
  isGpt: boolean;
}

export const ChatTemplate = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Messages[]>([]);

  const handlePost = async (text: string) => {
    setIsLoading(true);
    setMessages((prev) => [...prev, { text: text, isGpt: false }]);


    setIsLoading(false);



  };



  return (
    <div className="chat-container">
      <div className="chat-messages">
        <div className="grid grif-cols-12 gap-y-2">
          <GptMessages text=" Este es un test" iconSrc="/icons/marval.png" />
          {messages.map((message, index) =>
            message.isGpt ? (
              <GptMessages key={index} text="esto es un mensaje" iconSrc="/icons/marval.png" />
            ) : (
              <MyMessages key={index} text={message.text} />
            )
          )}

          {isLoading && (
            <div className="col-start1.col end 1">
              <LoaderTyping />
            </div>
          )}
        </div>
      </div>
      <TextBox
        onSendMessages={handlePost}
        placeholder="Ingresa aqui el mensaje"
        disableCorrection
      />
    </div>
  );
};
