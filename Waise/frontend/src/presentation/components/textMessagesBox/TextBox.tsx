// import { FormEvent } from "react";

// //establece las distintas prpiedades disponibles::
// interface Props{
//   onSendMessages:(message:string) =>void;
//   placeholder?: string;
//   disableCorrection: boolean;



// }
// //---------------------------------------------------
// //--------------------------------------------------


// const TextBox = ({
//   onSendMessages, placeholder, disableCorrection=false }:Props) => {
//     const HandleSendMessages= (event: FormEvent <HTMLFormElement>) =>

//       event.preventDefault()
//       console.log(HandleSendMessages)
   
//   return (
//     <form onSubmit = {HandleSendMessages}
//     className="flex items-center h-12 rounded-xl bg-white w-full px-4 gap-2">
//     <div className="flex-grown">
//       <div className="relative w-full ">
//         <input type="text" 
//         autoFocus 
//         name = "message"
//         className="w-full border rounded-xl text-gray-800 focus:outline-none focus:border-indigo-300 px-4 h-10"
//         placeholder={placeholder}
//         autoComplete={disableCorrection ? 'off':'on'}
//         autoCorrect={disableCorrection ? 'off':'on'}
        
        
        
//         />
//       </div>
//     </div>

//     <div className="ml-4">
//       <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">
//         prueba
//       </button>
//     </div>

//     </form>
//     )
//   }

// export default TextBox


//-------------------------------------------------------------
//-------------------------------------------------------------

import { FormEvent, useState } from "react";


interface Props {
  onSendMessages: (message: string, useWebSearch: boolean) => void;
  placeholder?: string;
  disableCorrection?: boolean;
}

const TextBox = ({
  onSendMessages,
  placeholder,
  disableCorrection = false,
}: Props) => {
  const [message, setMessage] = useState('')



  const HandleSendMessages = (event: FormEvent <HTMLFormElement>) => {
    event.preventDefault();

    

    const formData = new FormData(event.currentTarget);
    const message = formData.get('message')?.toString() || '';
    if (message.trim()) {
      onSendMessages(message, false);
      setMessage(''); // Limpiar el estado del input
      event.currentTarget.reset();

    }

    if (message.trim().length===0) return;
  };

  return (
    <form
      onSubmit={HandleSendMessages}
      className="flex items-center h-16 rounded-lg bg-white w-full px-4"
    >
      <div className="flex-grow">
        <input
          type="text"
          autoFocus
          name="message"
          className="w-full rounded-lg text-gray-800 focus:outline-none px-4 py-2 h20"
          placeholder={placeholder}
          autoComplete={disableCorrection ? 'on' : 'off'}
          autoCorrect={disableCorrection ? 'on' : 'off'}
          spellCheck = {disableCorrection ? 'true': 'false'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="fa-solid fa-arrow-up bg-black rounded-full p-2 text-white hover:bg-[#198243] hover:text-white"
      >
      </button>
    </form>
  );
};

export default TextBox;
//arreglos