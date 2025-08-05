import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context";

const LoginPages = () => {




  const {login} = useContext(AuthContext)
  const navigate = useNavigate();

  const handleLogin = () => {


    
    login('gabooo');
    navigate("/waisechat",{
      replace:true




    }); // Redirige a RouterMap después del login
  };

  return (
    <div>
      <h1>LoginPages</h1>
      <button onClick={handleLogin}>Iniciar Sesión</button>
    </div>
  );
};

export default LoginPages;
