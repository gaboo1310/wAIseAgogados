import Markdown from "react-markdown"

interface Props{
    text:string

}

const MyMessages = ({text}: Props) => {
  return (
    <div className="col-start-6 col-end-13 p-3 rounded-lg items-center"  >
        <div className="flex items-center justify-start flex-row-reverse">
            <div className=" relative ml-3 text-base bg-black bg-opacity-10 pt-3 pb-2 px-4 shadow rounded-xl leading-relaxed">
                <Markdown>{text}</Markdown>

            </div>

        </div>


    </div>

  )
}






export default MyMessages
