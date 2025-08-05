//#######################################################
import { FormEvent, useState } from "react";
//#######################################################
interface Props {
  onSendMessages: (message: string,selectedOption:string) => void;
  placeholder: string;
  disableCorrection?: boolean;
  options:Option[]
}

interface Option{
  id: string;
  text: string;

}

//#######################################################
const TextBoxSelect = ({onSendMessages,placeholder,disableCorrection = false, options}: Props) =>{
  const [message, setMessage] = useState('')
  const [selectOptions, setselectOptions] = useState<string>('');

//-------------------------------------------
  const HandleSendMessages = (event: FormEvent <HTMLFormElement>) => {
    event.preventDefault();

   

    const formData = new FormData(event.currentTarget);
    const message = formData.get('message')?.toString() || '';
    if (message.trim()) {
      onSendMessages(message,selectOptions);
      setMessage(''); 
      event.currentTarget.reset();

    }

    if (message.trim().length===0) return;
    if(selectOptions==='') return ;
  };
//----------------------------------------------------------------------------------
  return (
    <form
      onSubmit={HandleSendMessages}
      className="flex items-center h-24 rounded-lg bg-white w-full px-4"
    >
      <div className="flex-grow">
        <input
          type="text"
          autoFocus
          name="message"
          className="w-full border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 px-4 py-2 h20"
          placeholder={placeholder}
          autoComplete={disableCorrection ? 'on' : 'off'}
          autoCorrect={disableCorrection ? 'on' : 'off'}
          spellCheck = {disableCorrection ? 'true': 'false'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>


{/* ................ */}
      <select
        name="select"
        className="ml-5 rounded-xl text-gray-800 focus:outline-none focus:border-indigo-300 pl-2 h-10"
        value ={selectOptions}
        onChange={(e)=>setselectOptions(e.target.value)}
        >
          <option value=''>seleccione una opcion</option>
        {
        options.map(({ id, text }) => (
          <option
            key={id} value={id}>{text}</option>
      ))}
      </select>


{/* ................ */}
      <button
        type="submit"
        className="ml-3 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg h-12"
      >
        Enviar
      </button>
{/* ................ */}
    </form>
  );
};

export default TextBoxSelect;
