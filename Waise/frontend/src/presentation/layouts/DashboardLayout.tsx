// import { NavLink, Outlet } from "react-router-dom";
// import { menuRoutes } from "../router/router";
// import SidebarMenuItem from "../components/sidebar/SidebarMenuItem";

// const DashboardLayout = () => {
//   return (
//     <main className="flex flex-row mt-7">
//       <nav className="hidden sm:flex flex-col ml-5 w-[370px] min-h-[calc(100vh-3.0rem)] bg-gradient-to-b from-blue-500 to-purple-800 p-6 rounded-3xl shadow-lg">
//         <h1 className="font-extrabold text-3xl bg-gradient-to-r from-blue-300 to-purple-500 bg-clip-text text-transparent">
//           wAIse <span className="text-white"></span>
//         </h1>
//         <span className="text-lg text-gray-200 mt-2">¡Bienvenido de vuelta!</span>

//         <div className="border-gray-400 border-t mt-4 mb-6" />
//         {/* --------------------------------------------------------------------*/}
//         {/* --------------------------------------------------------------------*/}
//         {/* Opciones del menú */}
//         {
//             menuRoutes.map(option => (
//                 <SidebarMenuItem key ={option.to } {...option} />

//             ))
//         }

//         {/* --------------------------------------------------------------------*/}
//         {/* --------------------------------------------------------------------*/}






//       </nav>

//       <section className="mx-3 sm:mx-10 flex flex-col w-full h-[calc(100vh-50px)] bg-gradient-to-bl from-purple-900 via-blue-800 to-purple-700 p-6 rounded-3xl shadow-2xl">
//         <div className="flex flex-row h-full">
//           <div className="flex flex-col flex-auto h-full p-4 bg-purple-800 bg-opacity-50 rounded-xl">
//             <Outlet />
//           </div>
//         </div>
//       </section>
//     </main>
//   );
// };

// export default DashboardLayout;




import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import SidebarMenuItem from "../components/sidebar/SidebarMenuItem";
import { useContext } from 'react';
import { AuthContext } from '../../auth/context';
import { menuRoutes } from '../router/menuRoute';


const DashboardLayout = () => {
  console.log("DashboardLayout cargado");

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <main className="flex flex-row h-screen gap-4 p-4">
      {/* Sidebar con scroll si el contenido es demasiado largo */}
      <nav className="hidden sm:flex flex-col w-[280px] h-[calc(100vh-3.5rem)] 
                      bg-gradient-to-b from-blue-500 to-purple-800 p-6 rounded-3xl shadow-lg 
                      overflow-y-auto">
        <h1 className="font-extrabold text-3xl bg-gradient-to-r from-blue-300 to-purple-500 bg-clip-text text-transparent">
          wAIse
        </h1>

        {/* Mensaje de bienvenida */}
        <span className="text-lg text-gray-200 mt-2">¡Bienvenido de vuelta!</span>

        <div className="border-gray-400 border-t mt-4 mb-6" />

        {/* Opciones del menú con scroll si son muchas */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {menuRoutes.map((option) => (
            <SidebarMenuItem key={option.to} {...option} />
          ))}
        </div>

        {/* Botón de cerrar sesión */}
        <div className="mt-auto">
          <div className="text-white font-semibold">{user?.name}</div>
          <button
            className="w-full px-4 py-2 mt-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Contenido principal con margen uniforme y sin overflow oculto */}
      <section className="flex-1 h-[calc(100vh-3.5rem)] bg-gradient-to-bl from-purple-900 via-blue-800 to-purple-700 p-6 rounded-3xl shadow-2xl overflow-auto">
        <div className="h-full flex flex-col p-6 bg-purple-800 bg-opacity-50 rounded-xl">
          <Outlet />
        </div>
      </section>
    </main>
  );
};

export default DashboardLayout;
