import { NavLink } from "react-router-dom"

interface Props{
    to: string;
    icon: string;
    title: string;
    description:string;

}

const SidebarMenuItem = ({
    to,icon,title,description
}:Props) => {
  return (
    <NavLink
    key={to}
    to={to}
    className={({isActive}) =>
        isActive
        ? 'flex justify-center items-center hover:bg-white'
        : 'flex justify-center items-center hover:bg-yellow-800'                }   
>
    <div className="flex items-start gap-6">
        <i className={`${icon} text-2xl text-white ` }></i>
        <div className="flex flex-col flex-grown text-center ">
            <span className="text-lg  text-white font-semibold">
                {title}
            </span>
            <span className="text-sm text-gray-300 ">
                {description}
            </span>
        </div>
    </div>

    </NavLink>

  )
}

export default SidebarMenuItem
