

interface Props{
    userScore: number;
    errors: string[];
    message: string;
}

const GptOrthographyMessages = ({userScore,errors, message}: Props) => {
  return (
    <div className="col-start-1 col-end-8 p-3 rounded-lg" >
        <div className="flex flex-row items-start">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 flex-shrink-0">
                Bot

            </div>
            <div className=" relative ml-3 text-sm bg-black bg-opacity-25 pt-3 pb-2 px-4 shadow rounded-xl">
                <h3 className="text-2xl">Puntaje: {userScore}</h3>
                <p>{message}</p>
                {
                    (errors.length ===0)
                    ?<p>no se encontraron error</p>
                    :(
                        <div>
                            <h3 className="text-xl text-red-500 ">
                                errores encontrados: 
                                
                            </h3>
                            <ul>
                                {
                                    errors.map((error)=>(
                                        <li className="text-red-500">
                                            {error}
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                    )
                }

            </div>

        </div>

    </div>

  )
}

export default GptOrthographyMessages
