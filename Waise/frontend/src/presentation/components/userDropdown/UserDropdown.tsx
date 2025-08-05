import { useState } from "react";
import { useSession } from "../../../hooks/useSession";
import { useAuth0 } from "@auth0/auth0-react";
import "./User.css";

const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { destroySession } = useSession();
  const { user } = useAuth0();

  return (
    <div className="user-dropdown">
      <div className="user-button" onClick={() => setIsOpen(!isOpen)}>
        <img src="/icons/arrowdown.svg" alt="Arrow Down" className="icon" />
        <button ><img src={user?.picture} alt="Profile" className="user-icon" /></button>
      </div>
      {isOpen && (
        <div className="dropdown-menu">
          <button
            className="dropdown-item"
            onClick={destroySession}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
