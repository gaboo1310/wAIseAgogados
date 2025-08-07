import Markdown from "react-markdown"

interface Props{
    text:string

}

const MyMessages = ({text}: Props) => {
  return (
    <div className="user-message-container">
        <div className="user-message-wrapper">
            <div className="user-content">
                <Markdown>{text}</Markdown>
            </div>
        </div>
    </div>
  )
}






export default MyMessages
