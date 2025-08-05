

// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import AIButton from "../../components/buttons/buttonsIA";

// const WelcomePage: React.FC = () => {
//   const navigate = useNavigate();
//   const [redirect, setRedirect] = useState(false);

//   const handleAIButtonClick = (aiName: string, activeIcon: string): void => {
//     localStorage.setItem("activeAI", aiName);
//     localStorage.setItem("activeIcon", activeIcon);
//     setRedirect(true);
//   };

//   useEffect(() => {
//     if (redirect) {
//       navigate("/login");
//     }
//   }, [redirect, navigate]);

//   return (
//     <div style={styles.welcomeContainer}>
//       <h1 style={styles.welcomeTitle}>¡Bienvenido al Proyecto Argos!</h1>
//       <p style={styles.welcomeSubtitle}>Marval</p>
//       <div style={styles.aiOptions}>
//         <button
//           onClick={() => handleAIButtonClick("wAIse", "/icons/marval.png")}
//           style={styles.aiButton}
//         >
//           <img src="/icons/marval.png" alt="wAIse" style={styles.icon} />
//           wAIse
//         </button>
//       </div>
//     </div>
//   );
// };

// // 🎨 Definir los estilos en un objeto JavaScript
// const styles = {
//   welcomeContainer: {
//     fontFamily: "'Poppins', sans-serif",
//     display: "flex",
//     flexDirection: "column" as "column",
//     justifyContent: "center",
//     alignItems: "center",
//     height: "100vh",
//     textAlign: "center" as "center",
//     backgroundColor: "#fff",
//   },
//   welcomeTitle: {
//     fontSize: "2rem",
//     fontWeight: 600,
//     color: "#000",
//   },
//   welcomeSubtitle: {
//     fontWeight: 400,
//     fontSize: "1rem",
//     color: "#666",
//     marginTop: "10px",
//   },
//   aiOptions: {
//     display: "flex",
//     gap: "12px",
//     marginTop: "20px",
//   },
//   aiButton: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "10px",
//     background: "#ffffff",
//     border: "1px solid #ddd",
//     padding: "10px 18px",
//     borderRadius: "30px",
//     fontSize: "1rem",
//     fontWeight: 500,
//     color: "#848484",
//     cursor: "pointer",
//     transition: "all 0.3s ease",
//     boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
//     opacity: 0.8,
//     outline: "none",
//   },
//   aiButtonHover: {
//     background: "#ebebeb",
//     borderColor: "#ccc",
//     opacity: 1,
//     transform: "translateY(-1px)",
//   },
//   aiButtonFocus: {
//     color: "white",
//     background: "#198243",
//     borderColor: "#ccc",
//     opacity: 1,
//   },
//   icon: {
//     width: "20px",
//     height: "20px",
//   },
// };

// export default WelcomePage;



import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Cards, Faqs } from "../../helpers";
import SecuritySection from "../../components/securitySection/SecuritySection";
import FaqSection from "../../components/faq/faq";
import "./app.css";
import "./gradient.css";
import "./iconos.css";
import "./white.css";

const WelcomePage: React.FC = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  // Si está autenticado, usar Navigate directamente
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/waisechat" replace />;
  }

  // Si la autenticación está cargando, mostramos un mensaje de carga
  if (isLoading) {
    return <div style={styles.loading}>Cargando...</div>;
  }

  // Si el usuario no está autenticado, mostramos el botón de login
  if (!isAuthenticated) {
    return (
      <div className="main-container">
        <header className="navbar">
          <div className="logo">wAIse</div>
          <nav className="nav-links">
            <a href="#about">SOBRE wAIse</a>
            <a href="#contact">CONTACTO</a>
            <button
              className="login-button"
              onClick={() => loginWithRedirect({ appState: { returnTo: "/waisechat" } })}
            >
              Iniciar Sesión <img src="/iconos/vector3.png" alt="icono" className="icono-up" />
            </button>
          </nav>
          <div className="navbar-line"></div>
        </header>
  
        <section className="hero">
          <div className="hero-content">
            <h1>IA generativa experta</h1>
            <p>
              Eleva tu productividad con Inteligencia Artificial <br></br> personalizada
            </p>
            <button
              className="cta-button"
              onClick={() => document.getElementById("gradient-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              DESCUBRE COMO <img src="/iconos/arrowdown.png" alt="icono" className="icono-down" />
            </button>
          </div>
        </section>
        <section id="gradient-section" className="gradient-section">
        <div className="top-left-words">▪ IA PERSONALIZADA</div>
        <div className="gradient-content">
          <h2>
            wAIse es una Inteligencia Artificial<br></br> generativa que procesa y analiza datos no<br></br> estructurados
          </h2>
        </div>
        <div className="architecture-section card">
          <h3>
            Creada con arquitectura<br></br> de alto nivel
          </h3>
          <img src="/iconos/iconogrupal.png" alt="icono" className="icon-group" />
        </div>
        <SecuritySection />
        <div className="hover-container">
          <img src="/opaco.png" alt="icono" className="opaco" />
          <div className="security-image">
            Alcanza tus metas<br></br>con IA<br></br>hecha a tu medida
          </div>
        </div>
      </section>
      <section className="white-section">
        <div className="top-left-words3">▪ PRODUCTIVIDAD</div>
        <h2 className="section-title">Genera valor real al instante</h2>

        <div className="container-card">
          {Cards.map((card, index) => (
            <div key={index} className="container-card-main">
              <img src={card.image.url} alt={card.image.alt} className="iconow1" />

              <div className="text-block1">
                <h3>{card.mainText}</h3>
                <h4>{card.secondaryText}</h4>
                <span>{card.lastInformation}</span>
              </div>
            </div>
          ))}
        </div>
        <FaqSection Faqs={Faqs} />
      </section>
      </div>
    );
  }

  // Fallback - no debería llegar aquí
  return <div style={styles.loading}>Cargando...</div>;
};

// 🎨 Definir los estilos en un objeto JavaScript
const styles = {
  welcomeContainer: {
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    flexDirection: "column" as "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    textAlign: "center" as "center",
    backgroundColor: "#fff",
  },
  welcomeTitle: {
    fontSize: "2rem",
    fontWeight: 600,
    color: "#000",
  },
  welcomeSubtitle: {
    fontWeight: 400,
    fontSize: "1rem",
    color: "#666",
    marginTop: "10px",
  },
  aiOptions: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
  },
  aiButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "#ffffff",
    border: "1px solid #ddd",
    padding: "10px 18px",
    borderRadius: "30px",
    fontSize: "1rem",
    fontWeight: 500,
    color: "#848484",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    opacity: 0.8,
    outline: "none",
  },
  aiButtonHover: {
    background: "#ebebeb",
    borderColor: "#ccc",
    opacity: 1,
    transform: "translateY(-1px)",
  },
  aiButtonFocus: {
    color: "white",
    background: "#198243",
    borderColor: "#ccc",
    opacity: 1,
  },
  icon: {
    width: "20px",
    height: "20px",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "1.5rem",
    color: "#666",
  },
  loginBox: {
    display: "flex",
    flexDirection: "column" as "column",
    alignItems: "center",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    background: "#fff",
  },
  loginButton: {
    marginTop: "20px",
    padding: "12px 24px",
    background: "#4285F4",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.3s ease",
  },
};

export default WelcomePage;