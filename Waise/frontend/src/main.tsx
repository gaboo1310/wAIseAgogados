// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import { Waise } from './Waise'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <Waise></Waise>
//   </StrictMode>,
// )



import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Waise } from './Waise'
import { Auth0Provider } from '@auth0/auth0-react'

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

if (!domain || !clientId || !audience) {
  throw new Error("Faltan variables de entorno en Vite. Verifica tu archivo .env");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: `${window.location.origin}`,
        audience: audience,
        scope: "openid profile email",
      }}
      cacheLocation='localstorage'
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
    >
      <Waise></Waise>
    </Auth0Provider>
  </StrictMode>,
)
