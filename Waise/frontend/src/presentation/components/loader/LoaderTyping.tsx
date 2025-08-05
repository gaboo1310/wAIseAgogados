import "./LoaderTyping.css"

interface Props {
    classNames?: string;
  }
  
  const LoaderTyping = ({ classNames }: Props) => {
    return (
      <div className={`typing ${ classNames }`}>
        <span className="circle scaling"></span>
        <span className="circle scaling"></span>
        <span className="circle scaling"></span>
        
      </div>
    );
  };
  
  export default LoaderTyping;
  